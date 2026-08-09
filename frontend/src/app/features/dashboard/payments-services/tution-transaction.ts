// tuition-transactions.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, map, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment.development';

// ==========================
// ROUTE CONTRACT
//   POST   /api/payments/transactions/tuition                    -> createTuitionTransaction
//   POST   /api/payments/transactions/tuition/reverse             -> reverseTuitionTransaction
//   GET    /api/payments/transactions/tuition/payment/:paymentId  -> getPaymentWithTuitionTransactions
// ==========================

export interface TuitionTransactionRow {
  transaction_pk: string;
  transaction_id: string | null;
  payment_id: string;
  payment_method: 'cash' | 'card' | 'online';
  amount_paid: number;
  remarks: 'tuition';
  payment_date: string;
}

export interface PaymentRow {
  payment_id: string;
  concession: number;
  total_amount_paid: number;
  pending_amount: number;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  created_at: string;
  updated_at: string;
}

// CHANGED: payment_id replaced with the enrollment key
export interface CreateTuitionTransactionPayload {
  student_id: string;
  class_id: number;
  academic_year_id: number;
  payment_method: 'cash' | 'card' | 'online';
  amount_paid: number;
  transaction_id?: string | null;
  payment_date?: string | null;
  concession?: number;
}

export interface CreateTuitionTransactionResult {
  transaction: TuitionTransactionRow;
  payment: PaymentRow;
}

export interface ReverseTuitionTransactionPayload {
  transaction_pk: string;
  reversed_concession?: number;
}

export interface ReverseTuitionTransactionResult {
  deleted_transaction: TuitionTransactionRow;
  payment: PaymentRow | null;
}

export interface PaymentWithTuitionTransactions extends PaymentRow {
  transactions: TuitionTransactionRow[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class TuitionTransactionsService {
  private readonly baseUrl = `${environment.apiUrl}/payments/tuition`;

  constructor(private http: HttpClient) {}

  /**
   * CREATE a tuition transaction (and sync the payments aggregate row)
   * POST /api/payments/tuition
   * Backend resolves payment_id internally from student_id/class_id/academic_year_id.
   *
   * NOTE: fn_handle_tuition currently has a missing "INTO v_fee" bug on
   * the backend, so `payment.pending_amount`/`payment.payment_status`
   * in the response may not reflect the real fee until that's patched.
   */
  createTuitionTransaction(
    payload: CreateTuitionTransactionPayload
  ): Observable<CreateTuitionTransactionResult> {
    return this.http
      .post<ApiResponse<CreateTuitionTransactionResult> | CreateTuitionTransactionResult>(
        this.baseUrl,
        payload
      )
      .pipe(map(this.unwrap), catchError(this.handleError));
  }

  /**
   * REVERSE a tuition transaction (deletes the transaction row, re-syncs payments)
   * POST /api/payments/transactions/tuition/reverse
   */
  reverseTuitionTransaction(
    payload: ReverseTuitionTransactionPayload
  ): Observable<ReverseTuitionTransactionResult> {
    const url = `${this.baseUrl}/reverse`;
    return this.http
      .post<ApiResponse<ReverseTuitionTransactionResult> | ReverseTuitionTransactionResult>(
        url,
        payload
      )
      .pipe(map(this.unwrap), catchError(this.handleError));
  }

  /**
   * GET the payment row + all its tuition transactions
   * GET /api/payments/transactions/tuition/payment/:paymentId
   */
  getPaymentWithTuitionTransactions(
    paymentId: string
  ): Observable<PaymentWithTuitionTransactions | null> {
    const url = `${this.baseUrl}/${paymentId}`;

    return this.http
      .get<
        | ApiResponse<PaymentWithTuitionTransactions | null>
        | PaymentWithTuitionTransactions
        | null
      >(url)
      .pipe(
        map(this.unwrap),
        catchError(this.handleError)
      );
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