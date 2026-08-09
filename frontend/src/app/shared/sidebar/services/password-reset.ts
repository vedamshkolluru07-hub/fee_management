import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

/**
 * ======================================================
 * 🔹 RESET METHOD TYPE
 * ======================================================
 */
export type ResetMethod = 'otp' | 'token';

/**
 * ======================================================
 * 🔹 REQUEST TYPES
 * ======================================================
 */
export interface PasswordResetRequest {
  identifier: string;

  method: ResetMethod;

  otp?: string;
  token?: string;

  newPassword: string;
}

/**
 * ======================================================
 * 🔹 RESPONSE TYPES
 * ======================================================
 */
export interface PasswordResetResponse {
  success: boolean;
  message: string;
}

/**
 * ======================================================
 * 🔹 PASSWORD RESET SERVICE
 * ======================================================
 */
@Injectable({
  providedIn: 'root',
})
export class PasswordResetService {
  /**
   * ======================================================
   * 🔹 DEPENDENCIES
   * ======================================================
   */
  private http = inject(HttpClient);

  /**
   * ======================================================
   * 🔹 BASE URL
   * ======================================================
   */
  private baseUrl = `${environment.apiUrl}/password-reset`;

  /**
   * ======================================================
   * 🔹 RESET PASSWORD
   * POST /api/password-reset/password-reset
   * ======================================================
   */
  resetPassword(
    payload: PasswordResetRequest
  ): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(
      `${this.baseUrl}/password-reset`,
      payload,
      {
        withCredentials: true,
      }
    );
  }
}