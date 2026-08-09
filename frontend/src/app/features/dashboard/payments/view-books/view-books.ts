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
import { AcademicReadService, AcademicYear, Book, Class } from '../../../../shared/header/services/academic-read';
import {
  CreateBookEntry,
  CreateTransactionWithBooksPayload,
  TransactionBooksService,
  TransactionsWithBooksByPayment,
  BookPaymentRow,
  TransactionRow,
  ReverseBookEntry,
} from '../../payments-services/transaction-books';

type PaymentMethod = 'cash' | 'card' | 'online';

interface BookRowValue {
  book_id: number | null;
  books_amount: number;
  books_paid: number;
  books_discount: number;
  received: boolean;
}

interface BookRowControls {
  book_id: BookRowValue['book_id'];
  books_amount: BookRowValue['books_amount'];
  books_paid: BookRowValue['books_paid'];
  books_discount: BookRowValue['books_discount'];
  received: BookRowValue['received'];
}

@Component({
  selector: 'app-view-books',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './view-books.html',
  styleUrls: ['./view-books.css'],
})
export class ViewBooksComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly academicService = inject(AcademicReadService);
  private readonly studentState = inject(StudentStateService);
  private readonly transactionBooksService = inject(TransactionBooksService);
  private readonly destroy$ = new Subject<void>();

  // Populated from route.queryParams (Transactions.goToBooks() navigates
  // with queryParams, not route params — see Transactions component)
  studentId: string | null = null;
  paymentId: string | null = null;
  classId: number | null = null;
  academicYearId: number | null = null;

  selectedStudent: any = null;
  selectedAcademicYear: AcademicYear | null = null;
  classes: Class[] = [];
  selectedClass: Class | null = null;
  books: Book[] = [];

  // ==========================
  // FIX: Cumulative book-payment history for this payment_id.
  // Previously nothing on this page ever called
  // getTransactionsWithBooksByPaymentId, so there was no way to see
  // past book payments or reverse/mark-received them.
  // ==========================
  historyTransactions: TransactionRow[] = [];
  historyBooks: BookPaymentRow[] = [];
  historyLoading = false;
  historyError: string | null = null;
  reversingBookId: number | null = null;
  togglingBookId: number | null = null;

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

  // ======================================================
  // FIX: previously read from academicState.classes$/books$, which are
  // never populated by anything in the app (AcademicState.setBooks /
  // setClasses are only called from the Header component's own
  // dropdown-change handlers, not for this student's actual academic
  // year). We now fetch the academic year, its classes, and its books
  // directly and scope `books` to this student's classId ourselves.
  // ======================================================
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
          this.books = (data.books ?? []).filter((b) => b.classId === this.classId);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to load academic year/class/book data:', err);
          this.cdr.markForCheck();
        },
      });
  }

  // ======================================================
  // LOAD BOOK-PAYMENT HISTORY FOR THIS PAYMENT_ID
  // ======================================================
  loadHistory(): void {
    if (!this.paymentId) return;

    this.historyLoading = true;
    this.historyError = null;

    this.transactionBooksService
      .getTransactionsWithBooksByPaymentId(this.paymentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: TransactionsWithBooksByPayment) => {
          this.historyTransactions = res.transactions ?? [];
          this.historyBooks = res.books ?? [];
          this.historyLoading = false;
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.historyLoading = false;
          this.historyError = err.message || 'Unable to load book payment history.';
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
      book_id: this.fb.control<number | null>(null, Validators.required),
      books_amount: this.fb.nonNullable.control<number>({ value: 0, disabled: true }),
      books_paid: this.fb.nonNullable.control<number>(0, [Validators.required, Validators.min(0)]),
      books_discount: this.fb.nonNullable.control<number>(0, [Validators.min(0)]),
      received: this.fb.nonNullable.control<boolean>(false),
    });
  }

  addRow(): void {
    const row = this.createRow();
    this.rows.push(row);
    this.watchRowBookSelection(row);
  }

  removeRow(index: number): void {
    if (this.rows.length === 1) return;
    this.rows.removeAt(index);
  }

  onBookSelected(index: number): void {
    const row = this.rowAt(index);
    const bookId = row.get('book_id')?.value;
    const book = this.books.find((b) => b.bookId === bookId);
    row.get('books_amount')?.setValue(book?.bookAmount ?? 0);
  }

  private watchRowBookSelection(row: FormGroup): void {
    row.get('book_id')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((bookId: number | null) => {
        const book = this.books.find((b) => b.bookId === bookId);
        row.get('books_amount')?.setValue(book?.bookAmount ?? 0, { emitEvent: false });
      });
  }

  private watchTotal(): void {
    this.rows.controls.forEach((row) => this.watchRowBookSelection(row as FormGroup));
    this.rows.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.calculateTotal());
    this.calculateTotal();
  }

  private calculateTotal(): void {
    this.totalPaid = this.rows.controls.reduce((sum, row) => {
      const paid = Number(row.get('books_paid')?.value) || 0;
      return sum + paid;
    }, 0);
  }

  private validate(): string | null {
    if (!this.studentId || !this.classId || !this.academicYearId) {
      return 'Missing student, class, or academic year information.';
    }

    if (this.rows.length === 0) return 'Add at least one book row.';

    const bookIds = new Set<number>();

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rowAt(i);
      const bookId = row.get('book_id')?.value;
      const paid = row.get('books_paid')?.value;
      const discount = row.get('books_discount')?.value;

      if (bookId == null) return `Row ${i + 1}: please select a book.`;
      if (bookIds.has(bookId)) return `Row ${i + 1}: this book is already selected in another row.`;
      bookIds.add(bookId);

      if (paid == null || paid < 0) return `Row ${i + 1}: books paid must be 0 or more.`;
      if (discount == null || discount < 0) return `Row ${i + 1}: discount must be 0 or more.`;
    }

    if (this.form.get('payment_method')?.invalid) return 'Please select a payment method.';
    if (this.totalPaid <= 0) return 'Total amount paid must be greater than 0.';

    return null;
  }

  private buildPayload(): CreateTransactionWithBooksPayload {
    const raw = this.form.getRawValue() as {
      payment_method: PaymentMethod;
      transaction_id: string | null;
      payment_date: string | null;
      rows: BookRowControls[];
    };

    const books: CreateBookEntry[] = raw.rows.map((row) => ({
      book_id: row.book_id as number,
      books_paid: row.books_paid,
      books_discount: row.books_discount,
      received: row.received,
    }));

    return {
      student_id: this.studentId as string,
      class_id: this.classId as number,
      academic_year_id: this.academicYearId as number,
      payment_method: raw.payment_method,
      transaction_id: raw.transaction_id || null,
      payment_date: raw.payment_date || null,
      books,
    };
  }

  submit(): void {
    this.submitError = null;

    const validationError = this.validate();
    if (validationError) {
      this.submitError = validationError;
      return;
    }

    const payload = this.buildPayload();
    this.submitting = true;

    this.transactionBooksService
      .createTransactionWithBooks(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.submitting = false;
          this.resetForm();
          this.loadHistory();
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.submitting = false;
          this.submitError = err.message;
          this.cdr.markForCheck();
        },
      });
  }

  // ======================================================
  // REVERSE a single book's payment (full reversal of current
  // books_paid / books_discount for that book_id).
  // ======================================================
  reverseBook(book: BookPaymentRow): void {
    if (!this.paymentId) return;

    const confirmed = window.confirm(
      `Reverse the full payment for "${book.book_type}"?`
    );
    if (!confirmed) return;

    const entry: ReverseBookEntry = {
      book_id: book.book_id,
      books_paid: book.books_paid,
      books_discount: book.books_discount,
    };

    this.reversingBookId = book.book_id;
    this.historyError = null;

    this.transactionBooksService
      .reverseTransactionBookPayments({ payment_id: this.paymentId, books: [entry] })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.historyTransactions = res.transactions ?? [];
          this.historyBooks = res.books ?? [];
          this.reversingBookId = null;
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.reversingBookId = null;
          this.historyError = err.message || 'Unable to reverse this book payment.';
          this.cdr.markForCheck();
        },
      });
  }

  // ======================================================
  // TOGGLE received / not-received for a book row.
  // ======================================================
  toggleReceived(book: BookPaymentRow): void {
    if (!this.paymentId) return;

    this.togglingBookId = book.book_id;

    this.transactionBooksService
      .markBookReceived({
        payment_id: this.paymentId,
        book_id: book.book_id,
        received: !book.received,
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updated) => {
          this.togglingBookId = null;
          const idx = this.historyBooks.findIndex((b) => b.book_id === updated.book_id);
          if (idx > -1) {
            this.historyBooks[idx] = updated;
          }
          this.cdr.markForCheck();
        },
        error: (err: Error) => {
          this.togglingBookId = null;
          this.historyError = err.message || 'Unable to update received status.';
          this.cdr.markForCheck();
        },
      });
  }

  // ======================================================
  // INVOICE TOTALS
  // FIX: template previously called `.reduce(...)` with an arrow function
  // directly in bindings — Angular's template expression parser does not
  // support arrow functions, so this would fail to compile. Moved here.
  // ======================================================
  get invoiceTotalPaid(): number {
    return this.historyBooks.reduce((sum, book) => sum + Number(book.books_paid || 0), 0);
  }

  get invoiceTotalDiscount(): number {
    return this.historyBooks.reduce((sum, book) => sum + Number(book.books_discount || 0), 0);
  }

  get invoiceTotalPending(): number {
    return this.historyBooks.reduce((sum, book) => sum + Number(book.books_pending_amount || 0), 0);
  }

  // ======================================================
  // PRINT INVOICE
  // FIX: template's "Print Invoice" button called printInvoice(), which
  // didn't exist on the component. Shows the invoice section, waits for
  // it to render, then prints it in a dedicated window so the rest of
  // the Angular app (and its state) isn't destroyed by the print.
  // ======================================================
  printInvoice(): void {
    if (!this.historyBooks.length) return;

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
            <title>Books Payment Invoice - ${this.selectedStudent?.student_id ?? ''}</title>
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