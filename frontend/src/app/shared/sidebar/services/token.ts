import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

/**
 * -----------------------------------
 * API RESPONSE TYPES
 * -----------------------------------
 */
export interface SendResetTokenRequest {
  identifier: string;
}

export interface SendResetTokenResponse {
  success: boolean;
  message: string;

  token_id?: string;
  expires_at?: string;
}

/**
 * -----------------------------------
 * TOKEN RECORD TYPE
 * -----------------------------------
 */
export interface TokenRecord {
  token_id: string;
  user_id: string;

  token: string;

  expires_at: string;
  created_at: string;
}

/**
 * -----------------------------------
 * GET TOKENS RESPONSE
 * -----------------------------------
 */
export interface GetAllTokensResponse {
  success: boolean;
  data: TokenRecord[];
}

/**
 * -----------------------------------
 * TOKEN SERVICE
 * -----------------------------------
 */
@Injectable({
  providedIn: 'root',
})
export class TokenService {
  /**
   * -----------------------------------
   * DEPENDENCIES
   * -----------------------------------
   */
  private http = inject(HttpClient);

  /**
   * -----------------------------------
   * BASE URL
   * -----------------------------------
   */
  private baseUrl = `${environment.apiUrl}/token`;

  /**
   * -----------------------------------
   * SEND PASSWORD RESET TOKEN
   * POST /api/token/reset-password
   * -----------------------------------
   */
  sendPasswordResetToken(
    payload: SendResetTokenRequest
  ): Observable<SendResetTokenResponse> {
    return this.http.post<SendResetTokenResponse>(
      `${this.baseUrl}/reset-password`,
      payload,
      {
        withCredentials: true,
      }
    );
  }

  /**
   * -----------------------------------
   * GET ALL TOKENS
   * GET /api/token/all
   * -----------------------------------
   */
  getAllTokens(
    user_id?: string,
    limit: number = 50,
    offset: number = 0
  ): Observable<GetAllTokensResponse> {
    let params = new HttpParams()
      .set('limit', String(limit))
      .set('offset', String(offset));

    if (user_id) {
      params = params.set('user_id', user_id);
    }

    return this.http.get<GetAllTokensResponse>(
      `${this.baseUrl}/all`,
      {
        params,
        withCredentials: true,
      }
    );
  }
}