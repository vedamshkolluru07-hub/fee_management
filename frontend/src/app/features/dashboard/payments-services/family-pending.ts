import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, map, catchError } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

// ==========================
// TYPES
// ==========================

export interface PaymentItem {
  description: string;
  amount: number;
}

export interface FamilyPendingRow {
  // ================= STUDENT =================
  student_id: number;
  student_name: string;
  sur_name: string;
  name_vector: string | null;
  dob: string | null;
  gender: string;
  section: string;
  email_id: string | null;
  admission_date: string | null;
  is_connected: boolean | null;
  status: string;

  // ================= PARENT =================
  parents_id: number;
  contact_number: string;
  secondary_contact_number: string | null;

  fathers_first_name: string;
  fathers_sur_name: string;

  mothers_first_name: string;
  mothers_sur_name: string;

  parent_email: string | null;
  address: string | null;
  occupation: string | null;
  parent_is_connected: boolean | null;

  // ================= CLASS + PAYMENT =================
  class_id: number;
  academic_year_id: number;

  payment_id: number;
  total_amount_paid: number;
  total_amount_pending: number;
  payment_status: string;
  due_date: string | null;

  // NEW: returned by pb.payment_pending in the backend query
  // (CASE WHEN pending_amount > 0 THEN TRUE ELSE FALSE END).
  // Was missing from this interface even though the backend
  // always sends it.
  payment_pending: boolean;

  // ================= PENDING BREAKDOWN =================
  books_pending: number;
  uniform_pending: number;

  // OPTIONAL UI DATA
  books?: PaymentItem[];
  uniform?: PaymentItem[];

  // ================= LAST TRANSACTION =================
  transaction_id: number | null;
  last_transaction_amount: number | null;
  last_transaction_remarks: string | null;
  last_transaction_date: string | null;
  last_transaction_method: string | null;
}

export interface ApiResponse {
  success: boolean;
  count: number;
  data: FamilyPendingRow[];
}

// ==========================
// SERVICE
// ==========================

@Injectable({
  providedIn: 'root',
})
export class FamilyPendingService {

  private readonly baseUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  /**
   * GET FAMILY PENDING DATA
   * GET /api/payments/family-pending/:studentId
   */
  getFamilyPending(studentId: number | string): Observable<ApiResponse> {
    const url = `${this.baseUrl}/family-pending/${studentId}`;

    return this.http.get<ApiResponse>(url).pipe(

      // ✅ Normalize backend response safely
      map((res: any): ApiResponse => {
        return {
          success: Boolean(res?.success),
          count: Number(res?.count ?? 0),
          data: Array.isArray(res?.data) ? res.data : []
        };
      }),

      catchError(this.handleError)
    );
  }

  /**
   * ERROR HANDLING
   */
  private handleError(error: HttpErrorResponse) {
    let message = 'Something went wrong';

    if (error.error instanceof ErrorEvent) {
      message = `Client error: ${error.error.message}`;
    } else {
      message = `Server error: ${error.status}`;
    }

    return throwError(() => new Error(message));
  }
}