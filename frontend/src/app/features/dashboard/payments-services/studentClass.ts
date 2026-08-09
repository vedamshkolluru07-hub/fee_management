import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, map, catchError } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

// ==========================
// TYPES
// ==========================

export interface PaymentIdRequest {
  academic_year_id: number;
  class_id: number;
  student_id: number;
}

export interface PaymentIdResponse {
  success: boolean;
  data: {
    payment_id: string;
  };
}

// ==========================
// SERVICE
// ==========================

@Injectable({
  providedIn: 'root',
})
export class StudentClassesService {

  private readonly baseUrl = `${environment.apiUrl}/payments`;

  constructor(private http: HttpClient) {}

  /**
   * GET PAYMENT ID
   * POST /api/student-classes/payment-id
   */
  getPaymentId(
    request: PaymentIdRequest
  ): Observable<PaymentIdResponse> {

    return this.http
      .post<PaymentIdResponse>(
        `${this.baseUrl}/payment-id`,
        request
      )
      .pipe(
        map((res: any): PaymentIdResponse => ({
          success: Boolean(res?.success),
          data: {
            payment_id: String(res?.data?.payment_id ?? 0),
          },
        })),
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
      message = error.error?.message || `Server error: ${error.status}`;
    }

    return throwError(() => new Error(message));
  }
}