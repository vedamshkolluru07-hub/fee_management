import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

/**
 * ======================================================
 * 🔹 LOGIN ATTEMPT TYPE
 * ======================================================
 */
export interface LoginAttempt {
  attempt_id: string;

  user_id: string;

  ip_address: string;
  user_agent: string;

  device_info: any;

  success: boolean;

  attempted_at: string;
}

/**
 * ======================================================
 * 🔹 LOGIN ATTEMPTS RESPONSE
 * ======================================================
 */
export interface LoginAttemptsResponse {
  success: boolean;

  user_id?: string;

  data: LoginAttempt[];

  message?: string;
}

/**
 * ======================================================
 * 🔹 LOGIN ATTEMPTS SERVICE
 * ======================================================
 */
@Injectable({
  providedIn: 'root',
})
export class LoginAttemptsService {
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
  private baseUrl = `${environment.apiUrl}/login-attempts`;

  /**
   * ======================================================
   * 🔹 GET USER LOGIN ATTEMPTS
   * GET /login-attempts/:user_id?limit=&offset=
   * ======================================================
   */
  getUserLoginAttempts(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Observable<LoginAttemptsResponse> {
    const params = new HttpParams()
      .set('limit', String(limit))
      .set('offset', String(offset));

    return this.http.get<LoginAttemptsResponse>(
      `${this.baseUrl}/${userId}`,
      {
        params,
        withCredentials: true,
      }
    );
  }
}