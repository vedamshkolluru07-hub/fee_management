import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

/**
 * ======================================================
 * 🔹 REQUEST TYPES
 * ======================================================
 */
export interface SendOtpRequest {
  identifier: string;
  method?: 'sms' | 'email';
}

export interface VerifyOtpRequest {
  user_id: string;
  otp: string;
  method?: 'sms' | 'email';
}

/**
 * ======================================================
 * 🔹 RESPONSE TYPES
 * ======================================================
 */
export interface SendOtpResponse {
  success: boolean;
  message: string;

  otp_id?: string;
  expires_at?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
}

/**
 * ======================================================
 * 🔹 OTP RECORD TYPE
 * ======================================================
 */
export interface OtpRecord {
  otp_id: string;
  user_id: string;

  otp: string;

  method: 'sms' | 'email';

  expires_at: string;

  used: boolean;

  created_at: string;
}

/**
 * ======================================================
 * 🔹 GET ALL OTP RESPONSE
 * ======================================================
 */
export interface GetAllOtpResponse {
  success: boolean;
  data: OtpRecord[];
}

/**
 * ======================================================
 * 🔹 OTP REQUEST SERVICE
 * ======================================================
 */
@Injectable({
  providedIn: 'root',
})
export class OtpRequestService {
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
  private baseUrl = `${environment.apiUrl}/otp`;

  /**
   * ======================================================
   * 🔹 SEND OTP
   * POST /api/otp/send
   * ======================================================
   */
  sendOtp(
    payload: SendOtpRequest
  ): Observable<SendOtpResponse> {
    return this.http.post<SendOtpResponse>(
      `${this.baseUrl}/send`,
      payload,
      {
        withCredentials: true,
      }
    );
  }

  /**
   * ======================================================
   * 🔹 VERIFY OTP
   * POST /api/otp/verify
   * ======================================================
   */
  verifyOtp(
    payload: VerifyOtpRequest
  ): Observable<VerifyOtpResponse> {
    return this.http.post<VerifyOtpResponse>(
      `${this.baseUrl}/verify`,
      payload,
      {
        withCredentials: true,
      }
    );
  }

  /**
   * ======================================================
   * 🔹 GET ALL OTPS
   * GET /api/otp/all
   * ======================================================
   */
  getAllOtps(
    user_id?: string,
    limit: number = 50,
    offset: number = 0
  ): Observable<GetAllOtpResponse> {
    let params = new HttpParams()
      .set('limit', String(limit))
      .set('offset', String(offset));

    if (user_id) {
      params = params.set('user_id', user_id);
    }

    return this.http.get<GetAllOtpResponse>(
      `${this.baseUrl}/all`,
      {
        params,
        withCredentials: true,
      }
    );
  }
}