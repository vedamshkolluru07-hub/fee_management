import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';

import {
  TuitionTransactionsService,
  PaymentWithTuitionTransactions,
  TuitionTransactionRow,
  CreateTuitionTransactionResult,
  ReverseTuitionTransactionResult,
} from '../../payments-services/tution-transaction';

import { StudentStateService } from '../../payments-services/student-state.service';
import { AcademicReadService, AcademicYear, Class } from '../../../../shared/header/services/academic-read';

@Component({
  selector: 'app-view-tution',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './view-tution.html',
  styleUrl: './view-tution.css',
})
export class ViewTution implements OnInit, OnDestroy {
  // ==========================
  // Route Query Parameters
  // ==========================
  paymentId: string | null = null;
  studentId: string | null = null;
  classId: number | null = null;
  academicYearId: number | null = null;

  // ==========================
  // Display-only context
  // FIX: previously hardcoded to {} / null with a comment saying the
  // tuition-transactions backend has no student/academic-year/class
  // endpoints. That's true, but StudentStateService already holds the
  // student the user navigated from, and AcademicReadService.getAcademicYearFull
  // gives us the academic year + classes for this student's academicYearId.
  // We wire both up below so the "Student / Academic / Class Details"
  // sections in the template actually render.
  // ==========================
  student: any = {};
  selectedAcademicYear: AcademicYear | null = null;
  selectedClass: Class | null = null;
  private classes: Class[] = [];

  // ==========================
  // Payment + Transactions Data
  // ==========================
  paymentData: PaymentWithTuitionTransactions | null = null;
  showPrintBlock = false;
  // Client-side pagination only: getPaymentWithTuitionTransactions
  // returns ALL tuition transactions for the payment_id in one call —
  // the backend (transactionsRepository.getTransactions with limit:null)
  // has no offset/limit support, so paging happens here.
  offset = 0;
  limit = 10;

  // ==========================
  // Create Transaction Form
  // Matches CreateTuitionTransactionPayload in tuition-transactions.service.ts
  // ==========================
  paymentForm: FormGroup;

  // ==========================
  // UI States
  // ==========================
  loading = false;
  creating = false;
  reversing = false;
  error = '';
  showPaymentModal = false;

  private subscription = new Subscription();

  constructor(private route: ActivatedRoute,
    private fb: FormBuilder,
    private tuitionTransactionService: TuitionTransactionsService,
    private studentStateService: StudentStateService,
    private academicService: AcademicReadService,
    private cdr: ChangeDetectorRef) {
    this.paymentForm = this.fb.group({
      student_id: ['', Validators.required],
      class_id: ['', Validators.required],
      academic_year_id: ['', Validators.required],
      payment_method: ['', Validators.required],
      amount_paid: [null, [Validators.required, Validators.min(1)]],
      transaction_id: [null],
      payment_date: [null],
      concession: [0],
    });
  }

  ngOnInit(): void {
    this.subscription.add(
      this.route.queryParams.subscribe((params) => {
        this.paymentId = params['paymentId'] ?? null;
        this.studentId = params['studentId'] ?? null;
        this.classId = params['classId'] ? Number(params['classId']) : null;
        this.academicYearId = params['academicYearId']
          ? Number(params['academicYearId'])
          : null;

        // Pre-fill the create-payment form with the known enrollment keys
        this.paymentForm.patchValue({
          student_id: this.studentId,
          class_id: this.classId,
          academic_year_id: this.academicYearId,
        });

        console.log('Received Query Params:', {
          paymentId: this.paymentId,
          studentId: this.studentId,
          classId: this.classId,
          academicYearId: this.academicYearId,
        });

        this.loadDisplayContext();

        if (this.paymentId) {
          this.loadTuitionTransactions();
        } else {
          this.error = 'Payment ID is missing.';
        }
      })
    );
  }

  // ======================================================
  // LOAD STUDENT / ACADEMIC YEAR / CLASS FOR DISPLAY
  // ======================================================
  private loadDisplayContext(): void {
    this.student = this.studentStateService.getSelectedStudent() ?? {};

    if (!this.academicYearId) {
      this.selectedAcademicYear = null;
      this.selectedClass = null;
      return;
    }

    this.academicService.getAcademicYearFull(this.academicYearId).subscribe({
      next: (res) => {
        const data = res?.data;
        if (!data) return;

        this.selectedAcademicYear = data.academicYear ?? null;
        this.classes = data.classes ?? [];
        this.selectedClass =
          this.classes.find((c) => c.classId === this.classId) ?? null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load academic year/class data:', err);
        this.cdr.markForCheck();
      },
    });
  }

  // ======================================================
  // CREATE TUITION TRANSACTION
  // Bound to paymentForm / the modal's "Save Payment" button
  // POST /api/payments/transactions/tuition
  // Backend resolves payment_id internally from
  // student_id + class_id + academic_year_id (studentClassRepository.getPaymentId).
  // ======================================================
  createPayment(): void {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const raw = this.paymentForm.value;

    const payload = {
      student_id: raw.student_id,
      class_id: Number(raw.class_id),
      academic_year_id: Number(raw.academic_year_id),
      payment_method: raw.payment_method,
      amount_paid: Number(raw.amount_paid),
      transaction_id: raw.transaction_id || null,
      payment_date: raw.payment_date || null,
      concession: raw.concession ? Number(raw.concession) : 0,
    };

    this.creating = true;
    this.error = '';

    this.subscription.add(
      this.tuitionTransactionService.createTuitionTransaction(payload).subscribe({
        next: (response: CreateTuitionTransactionResult) => {
          console.log('Tuition Transaction Created:', response);

          this.creating = false;
          this.showPaymentModal = false;
          this.resetCreateForm();

          // Refresh payment + transaction history
          this.loadTuitionTransactions();
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.creating = false;
          this.error = err.message || 'Unable to create tuition transaction.';
          console.error('Create Transaction Error:', err);
          this.cdr.markForCheck();
        },
      })
    );
  }

  // ======================================================
  // LOAD PAYMENT + TRANSACTIONS
  // GET /api/payments/transactions/tuition/payment/:paymentId
  // ======================================================
  loadTuitionTransactions(printAfterLoad = false): void {
    if (!this.paymentId) {
      this.error = 'Payment ID is missing.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.subscription.add(
      this.tuitionTransactionService
        .getPaymentWithTuitionTransactions(this.paymentId)
        .subscribe({
          next: (response: PaymentWithTuitionTransactions | null) => {
            this.paymentData = response;
            this.offset = 0;
            this.loading = false;
            console.log('Payment With Tuition Transactions:', this.paymentData);
            this.cdr.markForCheck();
          },
          error: (err: Error) => {
            this.loading = false;
            this.error = err.message || 'Unable to load tuition transactions.';
            console.error('Load Tuition Transactions Error:', err);
            this.cdr.markForCheck();
          },
        })
    );
  }

  // ======================================================
  // REVERSE TRANSACTION
  // POST /api/payments/transactions/tuition/reverse
  // Template passes the whole transaction row; we pull transaction_pk from it.
  // ======================================================
  reverseTransaction(transaction: TuitionTransactionRow, reversedConcession = 0): void {
    if (!transaction?.transaction_pk) {
      return;
    }

    const confirmed = window.confirm('Are you sure you want to reverse this transaction?');
    if (!confirmed) {
      return;
    }

    this.reversing = true;
    this.error = '';

    this.subscription.add(
      this.tuitionTransactionService
        .reverseTuitionTransaction({
          transaction_pk: transaction.transaction_pk,
          reversed_concession: reversedConcession,
        })
        .subscribe({
          next: (response: ReverseTuitionTransactionResult) => {
            console.log('Transaction Reversed Successfully:', response);
            this.reversing = false;
            this.loadTuitionTransactions();
            this.cdr.markForCheck();
          },
          error: (err: Error) => {
            this.reversing = false;
            this.error = err.message || 'Unable to reverse transaction.';
            console.error('Reverse Transaction Error:', err);
            this.cdr.markForCheck();
          },
        })
    );
  }

  printReceipt(): void {
    const printContents = document.getElementById('printSection')?.innerHTML;
    if (!printContents) {
      this.error = 'Nothing to print. Load the receipt first.';
      return;
    }

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      this.error = 'Please allow pop-ups for this site to print the receipt.';
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Payment Receipt - ${this.payment?.payment_id ?? ''}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #212529; }
            h3, h5, h6 { margin: 0 0 4px 0; }
            hr { border: none; border-top: 1px solid #dee2e6; margin: 12px 0; }

            .row { display: flex; flex-wrap: wrap; margin-bottom: 12px; gap: 16px; }
            .col-md-6 { flex: 1 1 45%; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
            th, td { border: 1px solid #dee2e6; padding: 6px 10px; text-align: left; font-size: 14px; }
            .table-sm th, .table-sm td { padding: 4px 8px; font-size: 13px; }
            .table-light th { background-color: #f8f9fa; }

            .text-center { text-align: center; }
            .text-capitalize { text-transform: capitalize; }
            .fw-bold { font-weight: 700; }
            .text-success { color: #198754; }
            .text-danger { color: #dc3545; }
            .text-muted { color: #6c757d; }
            .small { font-size: 12px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-3 { margin-bottom: 12px; }
            .mb-4 { margin-bottom: 16px; }
            .mt-3 { margin-top: 12px; }
            .mt-4 { margin-top: 16px; }

            .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-size: 12px; color: #fff; }
            .bg-success { background-color: #198754; }
            .bg-warning { background-color: #ffc107; color: #212529; }
            .bg-info { background-color: #0dcaf0; color: #212529; }

            .no-print { display: none !important; }

            @page { margin: 18mm; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for content/styles to render before invoking the print dialog
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  }

  // ======================================================
  // TEMPLATE-FACING GETTERS
  // ======================================================

  // "Payment Summary" table binds to `payment`
  get payment(): PaymentWithTuitionTransactions | null {
    return this.paymentData;
  }

  // Client-side page slice of the full transaction list
  get transactions(): TuitionTransactionRow[] {
    if (!this.paymentData?.transactions) return [];
    return this.paymentData.transactions.slice(this.offset, this.offset + this.limit);
  }

  get totalTransactions(): number {
    return this.paymentData?.transactions?.length ?? 0;
  }

  get hasTransactions(): boolean {
    return this.totalTransactions > 0;
  }

  get totalTransactionAmount(): number {
    if (!this.paymentData?.transactions) return 0;
    return this.paymentData.transactions.reduce(
      (total, transaction) => total + Number(transaction.amount_paid),
      0
    );
  }

  get transactionCount(): number {
    return this.totalTransactions;
  }

  openPrintBlock() {
    this.showPrintBlock = true;
  }

  previousPage(): void {
    if (this.offset === 0) return;
    this.offset = Math.max(0, this.offset - this.limit);
  }

  nextPage(): void {
    if (this.offset + this.limit >= this.totalTransactions) return;
    this.offset += this.limit;
  }

  clearError(): void {
    this.error = '';
  }

  resetCreateForm(): void {
    this.paymentForm.reset({
      student_id: this.studentId,
      class_id: this.classId,
      academic_year_id: this.academicYearId,
      payment_method: '',
      amount_paid: null,
      transaction_id: null,
      payment_date: null,
      concession: 0,
    });
  }

  refresh(): void {
    this.loadTuitionTransactions();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}