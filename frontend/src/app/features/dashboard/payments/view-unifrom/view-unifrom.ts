import {
  Component,
  OnDestroy,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { StudentStateService } from '../../payments-services/student-state.service';
import { AcademicReadService, AcademicYear, Uniform, Class } from '../../../../shared/header/services/academic-read';
import {
  CreateUniformEntry,
  CreateTransactionWithUniformsPayload,
  TransactionUniformService,
  TransactionsWithUniformsByPayment,
  UniformPaymentRow,
  TransactionRow,
  ReverseUniformEntry,
} from '../../payments-services/transaction-uniform';

type PaymentMethod = 'cash' | 'card' | 'online';

interface UniformRowControls {
  uniform_id: number | null;
  uniform_amount: number;
  uniform_paid: number;
  uniform_discount: number;
  received: boolean;
}

@Component({
  selector: 'app-view-uniforms',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './view-unifrom.html',
  styleUrls: ['./view-unifrom.css'],
})
export class ViewUniformsComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly academicService = inject(AcademicReadService);
  private readonly studentState = inject(StudentStateService);
  private readonly transactionUniformService = inject(TransactionUniformService);
  private readonly destroy$ = new Subject<void>();

  studentId: string | null = null;
  paymentId: string | null = null;
  classId: number | null = null;
  academicYearId: number | null = null;

  selectedStudent: any = null;
  selectedAcademicYear: AcademicYear | null = null;
  classes: Class[] = [];
  selectedClass: Class | null = null;
  uniforms: Uniform[] = [];

  // Cumulative uniform-payment history for this payment_id
  historyTransactions: TransactionRow[] = [];
  historyUniforms: UniformPaymentRow[] = [];
  historyLoading = false;
  historyError: string | null = null;
  reversingUniformId: number | null = null;
  togglingUniformId: number | null = null;

  form!: FormGroup;
  totalPaid = 0;
  submitting = false;
  submitError: string | null = null;

  // ==========================
  // INVOICE
  // ==========================
  showInvoice = false;
  today = new Date();

  readonly paymentMethods: PaymentMethod[] = ['cash', 'card', 'online'];

  private initialized = false;

  ngOnInit(): void {
    this.buildForm();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        this.studentId = params['studentId'] ?? null;
        this.paymentId = params['paymentId'] ?? null;
        this.classId = params['classId'] ? Number(params['classId']) : null;
        this.academicYearId = params['academicYearId']
          ? Number(params['academicYearId'])
          : null;

        if (!this.initialized) {
          this.initialized = true;
          this.loadState();
          this.watchTotal();
          this.loadHistory();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildForm(): void {
    this.form = this.fb.group({
      payment_method: this.fb.nonNullable.control<PaymentMethod>('cash', Validators.required),
      transaction_id: this.fb.control<string | null>(null),
      payment_date: this.fb.control<string | null>(null),
      rows: this.fb.array([this.createRow()]),
    });
  }

  private loadState(): void {
    this.selectedStudent = this.studentState.getSelectedStudent();

    if (!this.academicYearId) {
      return;
    }

    this.academicService.getAcademicYearFull(this.academicYearId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const data = res?.data;
          if (!data) return;

          this.selectedAcademicYear = data.academicYear ?? null;
          this.classes = data.classes ?? [];
          this.selectedClass = this.classes.find((c) => c.classId === this.classId) ?? null;
          this.uniforms = (data.uniforms ?? []).filter(
            (u) => u.academicYearId === this.academicYearId
          );
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          console.error('Failed to load academic year/class/uniform data:', err);
          this.cdr.markForCheck();
        },
      });
  }

  // ======================================================
  // 3. getTransactionsWithUniformsByPaymentId
  // ======================================================
  loadHistory(): void {
    if (!this.paymentId) return;

    this.historyLoading = true;
    this.historyError = null;

    this.transactionUniformService
      .getTransactionsWithUniformsByPaymentId(this.paymentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: TransactionsWithUniformsByPayment) => {
          this.historyTransactions = res.transactions ?? [];
          this.historyUniforms = res.uniforms ?? [];
          this.historyLoading = false;
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.historyLoading = false;
          this.historyError = err instanceof Error
            ? err.message
            : 'Unable to load uniform payment history.';
          this.cdr.markForCheck();
        },
      });
  }

  get rows(): FormArray {
    return this.form.get('rows') as FormArray;
  }

  rowAt(index: number): FormGroup {
    return this.rows.at(index) as FormGroup;
  }

  private createRow(): FormGroup {
    return this.fb.group({
      uniform_id: this.fb.control<number | null>(null, Validators.required),
      uniform_amount: this.fb.nonNullable.control<number>({ value: 0, disabled: true }),
      uniform_paid: this.fb.nonNullable.control<number>(0, [Validators.required, Validators.min(0)]),
      uniform_discount: this.fb.nonNullable.control<number>(0, [Validators.min(0)]),
      received: this.fb.nonNullable.control<boolean>(false),
    });
  }

  addRow(): void {
    const row = this.createRow();
    this.rows.push(row);
    this.watchRowUniformSelection(row);
  }

  removeRow(index: number): void {
    if (this.rows.length === 1) return;
    this.rows.removeAt(index);
  }

  onUniformSelected(index: number): void {
    const row = this.rowAt(index);
    const uniformId = row.get('uniform_id')?.value;
    const uniform = this.uniforms.find((u) => u.uniformId === uniformId);
    row.get('uniform_amount')?.setValue(uniform?.uniformAmount ?? 0);
  }

  private watchRowUniformSelection(row: FormGroup): void {
    row.get('uniform_id')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((uniformId: number | null) => {
        const uniform = this.uniforms.find((u) => u.uniformId === uniformId);
        row.get('uniform_amount')?.setValue(uniform?.uniformAmount ?? 0, { emitEvent: false });
      });
  }

  private watchTotal(): void {
    this.rows.controls.forEach((row) => this.watchRowUniformSelection(row as FormGroup));
    this.rows.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.calculateTotal());
    this.calculateTotal();
  }

  private calculateTotal(): void {
    this.totalPaid = this.rows.controls.reduce((sum: number, row) => {
      const paid = Number(row.get('uniform_paid')?.value) || 0;
      return sum + paid;
    }, 0);
  }

  private validate(): string | null {
    if (!this.studentId || !this.classId || !this.academicYearId) {
      return 'Missing student, class, or academic year information.';
    }

    if (this.rows.length === 0) return 'Add at least one uniform row.';

    const uniformIds = new Set<number>();

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rowAt(i);
      const uniformId = row.get('uniform_id')?.value;
      const paid = row.get('uniform_paid')?.value;
      const discount = row.get('uniform_discount')?.value;

      if (uniformId == null) return `Row ${i + 1}: please select a uniform.`;
      if (uniformIds.has(uniformId)) return `Row ${i + 1}: this uniform is already selected.`;
      uniformIds.add(uniformId);

      if (paid == null || paid < 0) return `Row ${i + 1}: invalid paid amount.`;
      if (discount == null || discount < 0) return `Row ${i + 1}: invalid discount.`;
    }

    if (this.form.get('payment_method')?.invalid) return 'Please select payment method.';
    if (this.totalPaid <= 0) return 'Total amount paid must be greater than 0.';

    return null;
  }

  // ======================================================
  // 1. createTransactionWithUniforms
  // ======================================================
  private buildPayload(): CreateTransactionWithUniformsPayload {
    const raw = this.form.getRawValue() as {
      payment_method: PaymentMethod;
      transaction_id: string | null;
      payment_date: string | null;
      rows: UniformRowControls[];
    };

    const uniforms: CreateUniformEntry[] = raw.rows.map((row) => ({
      uniform_id: row.uniform_id as number,
      uniform_paid: row.uniform_paid,
      uniform_discount: row.uniform_discount,
      received: row.received,
    }));

    return {
      student_id: this.studentId as string,
      class_id: this.classId as number,
      academic_year_id: this.academicYearId as number,
      payment_method: raw.payment_method,
      transaction_id: raw.transaction_id || null,
      payment_date: raw.payment_date || null,
      uniforms,
    };
  }

  submit(): void {
    this.submitError = null;

    const error = this.validate();
    if (error) {
      this.submitError = error;
      return;
    }

    this.submitting = true;

    this.transactionUniformService
      .createTransactionWithUniforms(this.buildPayload())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submitting = false;
          this.resetForm();
          this.loadHistory();
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.submitting = false;
          this.submitError = err instanceof Error ? err.message : 'Failed to create transaction.';
          this.cdr.markForCheck();
        },
      });
  }

  // ======================================================
  // 2. getTransactionWithUniforms (single transaction lookup, on demand)
  // ======================================================
  viewTransaction(transactionPk: string): void {
    this.transactionUniformService
      .getTransactionWithUniforms(transactionPk)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (!result) {
            this.historyError = 'Transaction not found.';
            this.cdr.markForCheck();
            return;
          }
          console.log('Transaction detail:', result);
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.historyError = err instanceof Error ? err.message : 'Unable to load transaction.';
          this.cdr.markForCheck();
        },
      });
  }

  // ======================================================
  // 4. reverseTransactionUniformPayments
  // ======================================================
  reverseUniform(uniform: UniformPaymentRow): void {
    if (!this.paymentId) return;

    const confirmed = window.confirm(
      `Reverse the full payment for "${uniform.uniform_type}"?`
    );
    if (!confirmed) return;

    const entry: ReverseUniformEntry = {
      uniform_id: uniform.uniform_id,
      uniform_paid: uniform.uniform_paid,
      uniform_discount: uniform.uniform_discount,
    };

    this.reversingUniformId = uniform.uniform_id;
    this.historyError = null;

    this.transactionUniformService
      .reverseTransactionUniformPayments({ payment_id: this.paymentId, uniforms: [entry] })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: TransactionsWithUniformsByPayment) => {
          this.historyTransactions = res.transactions ?? [];
          this.historyUniforms = res.uniforms ?? [];
          this.reversingUniformId = null;
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.reversingUniformId = null;
          this.historyError = err instanceof Error
            ? err.message
            : 'Unable to reverse this uniform payment.';
          this.cdr.markForCheck();
        },
      });
  }

  // ======================================================
  // 5. markUniformReceived
  // ======================================================
  toggleReceived(uniform: UniformPaymentRow): void {
    if (!this.paymentId) return;

    this.togglingUniformId = uniform.uniform_id;

    this.transactionUniformService
      .markUniformReceived({
        payment_id: this.paymentId,
        uniform_id: uniform.uniform_id,
        received: !uniform.received,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated: UniformPaymentRow) => {
          this.togglingUniformId = null;
          const idx = this.historyUniforms.findIndex((u) => u.uniform_id === updated.uniform_id);
          if (idx > -1) {
            this.historyUniforms[idx] = updated;
          }
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.togglingUniformId = null;
          this.historyError = err instanceof Error
            ? err.message
            : 'Unable to update received status.';
          this.cdr.markForCheck();
        },
      });
  }

  // ======================================================
  // INVOICE TOTALS
  // Called from the template as method calls (getInvoiceTotalPaid(),
  // etc.) rather than getters — both work in Angular templates, but
  // these must exist on the component or the invoice section throws.
  // ======================================================
  getInvoiceTotalPaid(): number {
    return this.historyUniforms.reduce(
      (sum, uniform) => sum + Number(uniform.uniform_paid || 0),
      0
    );
  }

  getInvoiceTotalDiscount(): number {
    return this.historyUniforms.reduce(
      (sum, uniform) => sum + Number(uniform.uniform_discount || 0),
      0
    );
  }

  getInvoiceTotalPending(): number {
    return this.historyUniforms.reduce(
      (sum, uniform) => sum + Number(uniform.uniform_pending_amount || 0),
      0
    );
  }

  // ======================================================
  // PRINT INVOICE
  // FIX: template's "Print Invoice" button called printInvoice(), which
  // didn't exist on the component. Shows the invoice section, waits for
  // it to render, then prints it in a dedicated window so the rest of
  // the Angular app (and its state) isn't destroyed by the print.
  // ======================================================
  printInvoice(): void {
    if (!this.historyUniforms.length) return;

    this.today = new Date();
    this.showInvoice = true;
    this.cdr.detectChanges();

    // Wait a tick so *ngIf="showInvoice" has rendered #invoice into the DOM
    setTimeout(() => {
      const invoiceContents = document.getElementById('invoice')?.innerHTML;
      if (!invoiceContents) {
        this.historyError = 'Unable to prepare invoice for printing.';
        this.cdr.markForCheck();
        return;
      }

      const printWindow = window.open('', '_blank', 'width=900,height=700');
      if (!printWindow) {
        this.historyError = 'Please allow pop-ups for this site to print the invoice.';
        this.cdr.markForCheck();
        return;
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>Uniform Payment Invoice - ${this.selectedStudent?.student_id ?? ''}</title>
            <style>
              * { box-sizing: border-box; }
              body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #212529; }
              h1 { font-size: 22px; margin-bottom: 4px; }
              h3 { margin: 16px 0 8px 0; }
              .invoice-header { text-align: center; margin-bottom: 16px; border-bottom: 1px solid #dee2e6; padding-bottom: 12px; }
              .invoice-meta { text-align: left; margin-top: 12px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; font-size: 14px; }
              .invoice-section { margin-bottom: 20px; }
              .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
              .invoice-table th, .invoice-table td { border: 1px solid #dee2e6; padding: 6px 10px; font-size: 13px; text-align: left; }
              .invoice-table th { background-color: #f8f9fa; }
              .invoice-summary { display: flex; justify-content: space-between; border-top: 1px solid #dee2e6; padding-top: 10px; margin-bottom: 20px; font-size: 14px; }
              .invoice-footer { text-align: center; margin-top: 24px; font-size: 13px; color: #6c757d; }
              .center { text-align: center; }
              @page { margin: 18mm; }
            </style>
          </head>
          <body>${invoiceContents}</body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };

      this.showInvoice = false;
      this.cdr.markForCheck();
    }, 0);
  }

  private resetForm(): void {
    this.rows.clear();
    this.rows.push(this.createRow());
    this.form.patchValue({ payment_method: 'cash', transaction_id: null, payment_date: null });
    this.calculateTotal();
  }
}