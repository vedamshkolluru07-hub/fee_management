// transaction-books.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, map, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';

// ==========================
// ROUTE CONTRACT
//   POST   /api/payments/transactions/books                   -> createTransactionWithBooks
//   GET    /api/payments/transactions/books/:transactionPk     -> getTransactionWithBooks
//   GET    /api/payments/transactions/books/payment/:paymentId -> getTransactionsWithBooksByPaymentId
//   POST   /api/payments/transactions/books/reverse            -> reverseTransactionBookPayments
//   POST   /api/payments/transactions/books/received           -> markBookReceived
// ==========================

// ==========================
// TYPES
// ==========================

// NOTE: transaction_pk REMOVED from this row. bookspayments is now a
// single cumulative row per (payment_id, book_id) — it is NOT tied to
// any one transaction anymore.
export interface BookPaymentRow {
  id: string;
  payment_id: string;
  book_id: number;
  book_type: string;
  books_amount: number;
  books_paid: number;
  books_discount: number;
  books_pending_amount: number;
  books_payment_status: 'PENDING' | 'PAID';
  received: boolean;
  received_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionRow {
  transaction_pk: string;
  transaction_id: string | null;
  payment_id: string;
  payment_method: 'cash' | 'card' | 'online';
  amount_paid: number;
  remarks: 'books';
  payment_date: string;
}

// Returned by createTransactionWithBooks and getTransactionWithBooks.
// `books` here is ALL bookspayments rows for that payment_id (cumulative
// totals), not just the ones touched by this specific transaction.
export interface TransactionWithBooks extends TransactionRow {
  books: BookPaymentRow[];
}

// Returned by getTransactionsWithBooksByPaymentId AND by
// reverseTransactionBookPayments. Shape changed: no longer an array of
// per-transaction objects — now one object holding the full transaction
// history + the current cumulative book rows for that payment_id.
export interface TransactionsWithBooksByPayment {
  transactions: TransactionRow[]; // newest first
  books: BookPaymentRow[];
}

// ==========================
// INPUT: createTransactionWithBooks
//   student_id, class_id, academic_year_id -> backend resolves payment_id
//   via student_classes internally, do NOT send payment_id directly.
//   amount_paid on the created transaction = SUM of books[].books_paid
//   (calculated server-side, not sent by the client).
// ==========================
export interface CreateBookEntry {
  book_id: number;
  books_paid?: number;
  books_discount?: number;
  received?: boolean;
}

export interface CreateTransactionWithBooksPayload {
  student_id: string;
  class_id: number;
  academic_year_id: number;
  payment_method: 'cash' | 'card' | 'online';
  transaction_id?: string | null;
  payment_date?: string | null;
  books: CreateBookEntry[];
}

// ==========================
// INPUT: reverseTransactionBookPayments
//   CHANGED: no transaction_pk, no `received`, no `delete_row` anymore.
//   - transaction_pk removed: reversal is now scoped purely to
//     payment_id + book_id (bookspayments has no transaction link).
//   - received removed: reversal NEVER changes received/received_at.
//   - delete_row removed: the backend auto-deletes a book row once its
//     books_paid reaches 0 — no manual flag needed.
//   - books_paid / books_discount are OPTIONAL per entry and must be
//     within [0, currently_paid] / [0, currently_discounted] — the
//     backend validates and rejects out-of-range values with a 400.
// ==========================
export interface ReverseBookEntry {
  book_id: number;
  books_paid?: number;
  books_discount?: number;
}

export interface ReverseTransactionBookPaymentsPayload {
  payment_id: string;
  books: ReverseBookEntry[];
}

// ==========================
// INPUT: markBookReceived
//   Independent action — does not affect any payment/transaction amount.
// ==========================
export interface MarkBookReceivedPayload {
  payment_id: string;
  book_id: number;
  received: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

// ==========================
// SERVICE
// ==========================
@Injectable({
  providedIn: 'root',
})
export class TransactionBooksService {
  private readonly baseUrl = `${environment.apiUrl}/payments/books`;

  constructor(private http: HttpClient) {}

  /**
   * CREATE a transaction + its book payment rows.
   * POST /api/payments/transactions/books
   *
   * INPUT (body): CreateTransactionWithBooksPayload
   *   {
   *     student_id, class_id, academic_year_id,
   *     payment_method: 'cash'|'card'|'online',
   *     transaction_id?, payment_date?,
   *     books: [{ book_id, books_paid?, books_discount?, received? }]
   *   }
   *
   * OUTPUT: TransactionWithBooks
   *   {
   *     transaction_pk, transaction_id, payment_id, payment_method,
   *     amount_paid, remarks: 'books', payment_date,
   *     books: [ ...ALL bookspayments rows for this payment_id ]
   *   }
   */
  createTransactionWithBooks(
    payload: CreateTransactionWithBooksPayload
  ): Observable<TransactionWithBooks> {
    return this.http
      .post<ApiResponse<TransactionWithBooks> | TransactionWithBooks>(
        this.baseUrl,
        payload
      )
      .pipe(map(this.unwrap), catchError(this.handleError));
  }

  /**
   * GET a single transaction + all cumulative book rows for its payment_id.
   * GET /api/payments/transactions/books/:transactionPk
   *
   * INPUT: transactionPk: string (URL param)
   *
   * OUTPUT: TransactionWithBooks | null
   *   Same shape as create's output. null if the transaction_pk
   *   does not exist (404 from backend).
   */
  getTransactionWithBooks(
    transactionPk: string
  ): Observable<TransactionWithBooks | null> {
    const url = `${this.baseUrl}/${transactionPk}`;
    return this.http
      .get<ApiResponse<TransactionWithBooks | null> | TransactionWithBooks | null>(
        url
      )
      .pipe(map(this.unwrap), catchError(this.handleError));
  }

  /**
   * GET all 'books' transactions + cumulative book rows for a payment_id.
   * GET /api/payments/transactions/books/payment/:paymentId
   *
   * INPUT: paymentId: string (URL param)
   *
   * OUTPUT: TransactionsWithBooksByPayment
   *   {
   *     transactions: [ ...all 'books' transaction rows, newest first ],
   *     books: [ ...current cumulative bookspayments rows ]
   *   }
   *   CHANGED: previously returned an array of per-transaction objects
   *   (each embedding its own books). Now returns one combined object
   *   since book rows are no longer transaction-scoped.
   */
  getTransactionsWithBooksByPaymentId(
    paymentId: string
  ): Observable<TransactionsWithBooksByPayment> {
    const url = `${this.baseUrl}/payment/${paymentId}`;
    return this.http
      .get<
        ApiResponse<TransactionsWithBooksByPayment> | TransactionsWithBooksByPayment
      >(url)
      .pipe(
        map((res) => {
          const data = this.unwrap(res);
          return data ?? { transactions: [], books: [] };
        }),
        catchError(this.handleError)
      );
  }

  /**
   * REVERSE (partial/full) book payment(s) for a payment_id.
   * POST /api/payments/transactions/books/reverse
   *
   * INPUT (body): ReverseTransactionBookPaymentsPayload
   *   {
   *     payment_id,
   *     books: [{ book_id, books_paid?, books_discount? }]
   *   }
   *   NOTE: books_paid must be <= that book's current books_paid,
   *   books_discount must be <= that book's current books_discount.
   *   Backend cascades the total reversed amount across the newest
   *   'books' transactions (floored, never dropped below the reserve
   *   floor) and cleans up leftover transactions only once every book
   *   row for this payment_id has been fully reversed.
   *
   * OUTPUT: TransactionsWithBooksByPayment
   *   {
   *     transactions: [ ...remaining 'books' transaction rows ],
   *     books: [ ...remaining bookspayments rows (fully-reversed
   *              book_ids will simply be absent from this array) ]
   *   }
   */
  reverseTransactionBookPayments(
    payload: ReverseTransactionBookPaymentsPayload
  ): Observable<TransactionsWithBooksByPayment> {
    const url = `${this.baseUrl}/reverse`;
    return this.http
      .post<
        ApiResponse<TransactionsWithBooksByPayment> | TransactionsWithBooksByPayment
      >(url, payload)
      .pipe(
        map((res) => {
          const data = this.unwrap(res);
          return data ?? { transactions: [], books: [] };
        }),
        catchError(this.handleError)
      );
  }

  /**
   * MARK a book received / un-received. Independent action — does not
   * touch any payment/transaction amount, and reversal never calls this.
   * POST /api/payments/books/received
   *
   * INPUT (body): MarkBookReceivedPayload
   *   { payment_id, book_id, received: true|false }
   *
   * OUTPUT: BookPaymentRow
   *   The single updated bookspayments row, with `received` and
   *   `received_at` reflecting the new state (received_at is null
   *   when received = false).
   */
  markBookReceived(
    payload: MarkBookReceivedPayload
  ): Observable<BookPaymentRow> {
    const url = `${this.baseUrl}/received`;
    return this.http
      .post<ApiResponse<BookPaymentRow> | BookPaymentRow>(url, payload)
      .pipe(map(this.unwrap), catchError(this.handleError));
  }

  /**
   * Accepts either a raw payload or one wrapped in { success, data }.
   */
  private unwrap<T>(res: ApiResponse<T> | T): T {
    if (res && typeof res === 'object' && 'data' in (res as any)) {
      return (res as ApiResponse<T>).data;
    }
    return res as T;
  }

  /**
   * ERROR HANDLING
   */
  private handleError(error: HttpErrorResponse) {
    let message = 'Something went wrong';
    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      message = error.error?.message
        ? `Server error: ${error.error.message}`
        : `Server error: ${error.status}`;
    }
    return throwError(() => new Error(message));
  }
}