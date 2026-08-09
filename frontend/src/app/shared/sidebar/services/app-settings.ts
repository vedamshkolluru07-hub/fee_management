import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment.development';

/* ======================================================
   🔹 RESPONSE INTERFACES
====================================================== */

export interface AppSetting {
  key: string;
  value: string;
}

export interface BaseResponse {
  success: boolean;
}

export interface RestrictionResponse extends BaseResponse {
  restricted: boolean;
}

export interface LimitResponse extends BaseResponse {
  limit: number;
}

/* ======================================================
   🔹 SERVICE
====================================================== */

@Injectable({
  providedIn: 'root',
})
export class AppSettingsService {
  private http = inject(HttpClient);

  private baseUrl = `${environment.apiUrl}/settings`;

  /**
   * Local reactive cache (optional but useful for Angular 16+ signals)
   */
  settings = signal<Record<string, string>>({});

  // ======================================================
  // INIT DEFAULT SETTINGS
  // ======================================================
  initialize(): Observable<BaseResponse> {
    return this.http.post<BaseResponse>(`${this.baseUrl}/init`, {});
  }

  // ======================================================
  // UPDATE SETTING
  // ======================================================
  updateSetting(key: string, value: string): Observable<BaseResponse> {
    return this.http
      .put<BaseResponse>(`${this.baseUrl}/update`, { key, value })
      .pipe(
        tap(() => {
          this.settings.update((prev) => ({
            ...prev,
            [key]: value,
          }));
        })
      );
  }

  // ======================================================
  // GET SETTING BY KEY
  // ======================================================
  getSetting(key: string): Observable<AppSetting> {
    return this.http.get<AppSetting>(`${this.baseUrl}/${key}`);
  }

  // ======================================================
  // 🔹 USER RULES
  // ======================================================

  isUserRestricted(): Observable<RestrictionResponse> {
    return this.http.get<RestrictionResponse>(
      `${this.baseUrl}/user/restriction`
    );
  }

  getUserLimit(): Observable<LimitResponse> {
    return this.http.get<LimitResponse>(`${this.baseUrl}/user/limit`);
  }

  // ======================================================
  // 🔹 ADMIN RULES
  // ======================================================

  isAdminRestricted(): Observable<RestrictionResponse> {
    return this.http.get<RestrictionResponse>(
      `${this.baseUrl}/admin/restriction`
    );
  }

  getAdminLimit(): Observable<LimitResponse> {
    return this.http.get<LimitResponse>(`${this.baseUrl}/admin/limit`);
  }
}