import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/**
 * ======================================================
 * 🔹 TYPES
 * ======================================================
 */
export interface ActivityPeriod {
  start: string;
  end?: string | null;
  ip_address?: string;
  user_agent?: string;
  device_info?: string;
}

export interface DeviceSession {
  user_id: string;
  session_date: string;
  activity_periods: ActivityPeriod[];
  created_at: string;
  updated_at: string;
}

export interface GetSessionsResponse {
  success: boolean;
  message?: string;
  user_id?: string;
  data?: DeviceSession[];
  candidates?: { user_id: string; first_name: string; last_name: string }[];
}

export interface DeleteSessionResponse {
  success: boolean;
  message?: string;
  user_id?: string;
  data?: DeviceSession | null;
}

export interface GetSessionsParams {
  user_id?: string;
  name?: string;
  limit?: number;
  offset?: number;
}

export interface DeleteSessionParams {
  user_id?: string;
  name?: string;
  date: string;
}

/**
 * ======================================================
 * 🔹 SERVICE
 * ======================================================
 * Backend authorization note (see deviceSessionService.js):
 * - Omitting user_id/name defaults to the caller's own sessions.
 * - Passing another user's id/name only succeeds if the caller is
 *   privileged (admin / can_manage_users) — otherwise the API returns
 *   403. The component should only ever offer users the caller is
 *   actually allowed to pick (see DeviceSessionComponent).
 */
@Injectable({ providedIn: 'root' })
export class DeviceSessionService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/sessions/sessions`;

  getSessions(params: GetSessionsParams): Observable<GetSessionsResponse> {
    let httpParams = new HttpParams();

    if (params.user_id) httpParams = httpParams.set('user_id', params.user_id);
    if (params.name) httpParams = httpParams.set('name', params.name);
    if (params.limit != null) httpParams = httpParams.set('limit', params.limit);
    if (params.offset != null) httpParams = httpParams.set('offset', params.offset);

    return this.http.get<GetSessionsResponse>(this.baseUrl, {
      params: httpParams,
      withCredentials: true,
    });
  }

  deleteSession(params: DeleteSessionParams): Observable<DeleteSessionResponse> {
    return this.http.delete<DeleteSessionResponse>(this.baseUrl, {
      body: params,
      withCredentials: true,
    });
  }
}