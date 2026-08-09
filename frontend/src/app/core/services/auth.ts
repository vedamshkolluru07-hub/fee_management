// auth.service.ts

import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, catchError, of, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment.development';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface CurrentUser {
  user_id: string;
  username: string;
  role: string;
  can_manage_users: boolean;
  is_approved: boolean;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface CreateUserPayload {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}

export interface CreateAdminPayload {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private baseUrl = `${environment.apiUrl}/auth`;

  // ======================================================
  // 🔐 CURRENT USER CACHE (used by authGuard / roleGuard / canManageUsersGuard)
  // ======================================================
  private _user = signal<CurrentUser | null>(null);
  private _checked = signal(false);
  private inFlight$: Observable<CurrentUser | null> | null = null;

  readonly user = this._user.asReadonly();
  readonly isLoggedIn = computed(() => this._user() !== null);
  readonly role = computed(() => this._user()?.role ?? null);
  readonly canManageUsers = computed(() => this._user()?.can_manage_users ?? false);

  constructor(private http: HttpClient) {}

  /** Guards call this to know whether auth state was already resolved this session */
  hasChecked(): boolean {
    return this._checked();
  }

  /**
   * GET /auth/me
   * Confirms the session is still valid and refreshes role/can_manage_users
   * (these can change mid-session, e.g. an admin revokes a permission).
   */
  fetchCurrentUser(): Observable<CurrentUser | null> {
    if (this.inFlight$) return this.inFlight$;

    this.inFlight$ = this.http
      .get<ApiResponse<CurrentUser>>(`${this.baseUrl}/me`, { withCredentials: true })
      .pipe(
        map((res) => res.data ?? null),
        tap((user) => {
          this._user.set(user);
          this._checked.set(true);
        }),
        catchError(() => {
          this._user.set(null);
          this._checked.set(true);
          return of(null);
        }),
        shareReplay(1)
      );

    return this.inFlight$;
  }

  /** Call after logout, or on a 401, to force the next guard check to hit the backend again */
  clearCachedUser(): void {
    this._user.set(null);
    this._checked.set(false);
    this.inFlight$ = null;
  }

  // ======================================================
  // LOGIN
  // ======================================================
  login(data: LoginPayload): Observable<ApiResponse<CurrentUser>> {
    return this.http
      .post<ApiResponse<CurrentUser>>(`${this.baseUrl}/login`, data, { withCredentials: true })
      .pipe(
        tap((res) => {
          if (res.success && res.data) {
            this._user.set(res.data);
            this._checked.set(true);
          }
        })
      );
  }

  // ======================================================
  // LOGOUT
  // ======================================================
  logout(): Observable<ApiResponse> {
    return this.http
      .post<ApiResponse>(`${this.baseUrl}/logout`, {}, { withCredentials: true })
      .pipe(tap(() => this.clearCachedUser()));
  }

  // ======================================================
  // CREATE USER
  // ======================================================
  createUser(data: CreateUserPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/users`,
      data,
      { withCredentials: true }
    );
  }

  // ======================================================
  // CREATE ADMIN
  // ======================================================
  createAdmin(data: CreateAdminPayload): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/admins`,
      data,
      { withCredentials: true }
    );
  }

  // ======================================================
  // PASSWORD RESET (OTP or TOKEN)
  // ======================================================
  resetPassword(payload: {
    identifier: string;
    method: 'otp' | 'token';
    otp?: string;
    token?: string;
    newPassword: string;
  }): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(
      `${this.baseUrl}/password-reset`,
      payload,
      { withCredentials: true }
    );
  }
}