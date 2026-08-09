// transaction-uniform.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, map, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';

// ==========================
// ROUTE CONTRACT
//   POST   /api/payments/transactions/uniforms                   -> createTransactionWithUniforms
//   GET    /api/payments/transactions/uniforms/:transactionPk     -> getTransactionWithUniforms
//   GET    /api/payments/transactions/uniforms/payment/:paymentId -> getTransactionsWithUniformsByPaymentId
//   POST   /api/payments/transactions/uniforms/reverse            -> reverseTransactionUniformPayments
//   POST   /api/payments/transactions/uniforms/received           -> markUniformReceived
// ==========================

// ==========================
// TYPES
// ==========================

// uniformpayments is a single cumulative row per (payment_id, uniform_id) —
// it is NOT tied to any one transaction.
export interface UniformPaymentRow {
  id: string;
  payment_id: string;
  uniform_id: number;
  uniform_type: string;
  uniform_amount: number;
  uniform_paid: number;
  uniform_discount: number;
  uniform_pending_amount: number;
  uniform_payment_status: 'PENDING' | 'PAID';
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
  remarks: 'uniform';
  payment_date: string;
}

// Returned by createTransactionWithUniforms and getTransactionWithUniforms.
// `uniforms` here is ALL uniformpayments rows for that payment_id
// (cumulative totals), not just the ones touched by this transaction.
export interface TransactionWithUniforms extends TransactionRow {
  uniforms: UniformPaymentRow[];
}

// Returned by getTransactionsWithUniformsByPaymentId AND by
// reverseTransactionUniformPayments.
export interface TransactionsWithUniformsByPayment {
  transactions: TransactionRow[]; // newest first
  uniforms: UniformPaymentRow[];
}

// ==========================
// INPUT: createTransactionWithUniforms
//   student_id, class_id, academic_year_id -> backend resolves payment_id
//   via student_classes internally, do NOT send payment_id directly.
//   amount_paid on the created transaction = SUM of uniforms[].uniform_paid
//   (calculated server-side, not sent by the client).
// ==========================
export interface CreateUniformEntry {
  uniform_id: number;
  uniform_paid?: number;
  uniform_discount?: number;
  received?: boolean;
}

export interface CreateTransactionWithUniformsPayload {
  student_id: string;
  class_id: number;
  academic_year_id: number;
  payment_method: 'cash' | 'card' | 'online';
  transaction_id?: string | null;
  payment_date?: string | null;
  uniforms: CreateUniformEntry[];
}

// ==========================
// INPUT: reverseTransactionUniformPayments
//   No transaction_pk, no `received`, no `delete_row`.
//   - Reversal is scoped purely to payment_id + uniform_id.
//   - received removed: reversal NEVER changes received/received_at.
//   - delete_row removed: backend auto-deletes a uniform row once its
//     uniform_paid reaches 0 — no manual flag needed.
//   - uniform_paid / uniform_discount are OPTIONAL per entry and must
//     be within [0, currently_paid] / [0, currently_discounted] — the
//     backend validates and rejects out-of-range values with a 400.
// ==========================
export interface ReverseUniformEntry {
  uniform_id: number;
  uniform_paid?: number;
  uniform_discount?: number;
}

export interface ReverseTransactionUniformPaymentsPayload {
  payment_id: string;
  uniforms: ReverseUniformEntry[];
}

// ==========================
// INPUT: markUniformReceived
//   Independent action — does not affect any payment/transaction amount.
// ==========================
export interface MarkUniformReceivedPayload {
  payment_id: string;
  uniform_id: number;
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
export class TransactionUniformService {
  private readonly baseUrl = `${environment.apiUrl}/payments/uniforms`;

  constructor(private http: HttpClient) {}

  /**
   * CREATE a transaction + its uniform payment rows.
   * POST /api/payments/uniforms
   *
   * INPUT (body): CreateTransactionWithUniformsPayload
   *   {
   *     student_id, class_id, academic_year_id,
   *     payment_method: 'cash'|'card'|'online',
   *     transaction_id?, payment_date?,
   *     uniforms: [{ uniform_id, uniform_paid?, uniform_discount?, received? }]
   *   }
   *
   * OUTPUT: TransactionWithUniforms
   *   {
   *     transaction_pk, transaction_id, payment_id, payment_method,
   *     amount_paid, remarks: 'uniform', payment_date,
   *     uniforms: [ ...ALL uniformpayments rows for this payment_id ]
   *   }
   */
  createTransactionWithUniforms(
    payload: CreateTransactionWithUniformsPayload
  ): Observable<TransactionWithUniforms> {
    return this.http
      .post<ApiResponse<TransactionWithUniforms> | TransactionWithUniforms>(
        this.baseUrl,
        payload
      )
      .pipe(map(this.unwrap), catchError(this.handleError));
  }

  /**
   * GET a single transaction + all cumulative uniform rows for its payment_id.
   * GET /api/payments/transactions/uniforms/:transactionPk
   *
   * INPUT: transactionPk: string (URL param)
   *
   * OUTPUT: TransactionWithUniforms | null
   *   Same shape as create's output. null if the transaction_pk
   *   does not exist (404 from backend).
   */
  getTransactionWithUniforms(
    transactionPk: string
  ): Observable<TransactionWithUniforms | null> {
    const url = `${this.baseUrl}/${transactionPk}`;
    return this.http
      .get<
        ApiResponse<TransactionWithUniforms | null> | TransactionWithUniforms | null
      >(url)
      .pipe(map(this.unwrap), catchError(this.handleError));
  }

  /**
   * GET all 'uniform' transactions + cumulative uniform rows for a payment_id.
   * GET /api/payments/transactions/uniforms/payment/:paymentId
   *
   * INPUT: paymentId: string (URL param)
   *
   * OUTPUT: TransactionsWithUniformsByPayment
   *   {
   *     transactions: [ ...all 'uniform' transaction rows, newest first ],
   *     uniforms: [ ...current cumulative uniformpayments rows ]
   *   }
   */
  getTransactionsWithUniformsByPaymentId(
    paymentId: string
  ): Observable<TransactionsWithUniformsByPayment> {
    const url = `${this.baseUrl}/payment/${paymentId}`;
    return this.http
      .get<
        | ApiResponse<TransactionsWithUniformsByPayment>
        | TransactionsWithUniformsByPayment
      >(url)
      .pipe(
        map((res) => {
          const data = this.unwrap(res);
          return data ?? { transactions: [], uniforms: [] };
        }),
        catchError(this.handleError)
      );
  }

  /**
   * REVERSE (partial/full) uniform payment(s) for a payment_id.
   * POST /api/payments/transactions/uniforms/reverse
   *
   * INPUT (body): ReverseTransactionUniformPaymentsPayload
   *   {
   *     payment_id,
   *     uniforms: [{ uniform_id, uniform_paid?, uniform_discount? }]
   *   }
   *   NOTE: uniform_paid must be <= that uniform's current uniform_paid,
   *   uniform_discount must be <= that uniform's current uniform_discount.
   *   Backend cascades the total reversed amount across the newest
   *   'uniform' transactions (floored, never dropped below the reserve
   *   floor) and cleans up leftover transactions only once every uniform
   *   row for this payment_id has been fully reversed.
   *
   * OUTPUT: TransactionsWithUniformsByPayment
   *   {
   *     transactions: [ ...remaining 'uniform' transaction rows ],
   *     uniforms: [ ...remaining uniformpayments rows (fully-reversed
   *                 uniform_ids will simply be absent from this array) ]
   *   }
   */
  reverseTransactionUniformPayments(
    payload: ReverseTransactionUniformPaymentsPayload
  ): Observable<TransactionsWithUniformsByPayment> {
    const url = `${this.baseUrl}/reverse`;
    return this.http
      .post<
        | ApiResponse<TransactionsWithUniformsByPayment>
        | TransactionsWithUniformsByPayment
      >(url, payload)
      .pipe(
        map((res) => {
          const data = this.unwrap(res);
          return data ?? { transactions: [], uniforms: [] };
        }),
        catchError(this.handleError)
      );
  }

  /**
   * MARK a uniform item received / un-received. Independent action —
   * does not touch any payment/transaction amount, and reversal never
   * calls this.
   * POST /api/payments/transactions/uniforms/received
   *
   * INPUT (body): MarkUniformReceivedPayload
   *   { payment_id, uniform_id, received: true|false }
   *
   * OUTPUT: UniformPaymentRow
   *   The single updated uniformpayments row, with `received` and
   *   `received_at` reflecting the new state (received_at is null
   *   when received = false).
   */
  markUniformReceived(
    payload: MarkUniformReceivedPayload
  ): Observable<UniformPaymentRow> {
    const url = `${this.baseUrl}/received`;
    return this.http
      .post<ApiResponse<UniformPaymentRow> | UniformPaymentRow>(url, payload)
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