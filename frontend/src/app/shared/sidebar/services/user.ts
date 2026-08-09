import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

/**
 * -----------------------------------
 * API RESPONSE TYPE
 * -----------------------------------
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  total?: number;
}

/**
 * -----------------------------------
 * USER TYPE
 * -----------------------------------
 */
export interface User {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone: string;

  role: 'admin' | 'user' | 'moderator';

  can_manage_users: boolean;
  is_approved: boolean;
  deleted: boolean;

  approved_by?: string;

  created_at: string;
  last_action_at: string;
}

/**
 * -----------------------------------
 * USER SERVICE
 * -----------------------------------
 */
@Injectable({
  providedIn: 'root',
})
export class UserService {
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
  private baseUrl = `${environment.apiUrl}/users`;

  /**
   * -----------------------------------
   * CREATE USERS
   * -----------------------------------
   */
  createUser(payload: {
    username: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone: string;
    password: string;
    role?: string;
  }): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(
      `${this.baseUrl}/create-user`,
      payload,
      {
        withCredentials: true,
      }
    );
  }

  createAdmin(payload: {
    username: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone: string;
    password: string;
    role?: string;
  }): Observable<ApiResponse<User>> {
    return this.http.post<ApiResponse<User>>(
      `${this.baseUrl}/create-admin`,
      payload,
      {
        withCredentials: true,
      }
    );
  }

  /**
   * -----------------------------------
   * GET USERS
   * -----------------------------------
   */
  getUser(identifier: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(
      `${this.baseUrl}/get-user/${identifier}`,
      {
        withCredentials: true,
      }
    );
  }

  getUserById(userId: string): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(
      `${this.baseUrl}/get-user-by-id/${userId}`,
      {
        withCredentials: true,
      }
    );
  }

  getUserIdByName(name: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('name', name);

    return this.http.get<ApiResponse<any>>(
      `${this.baseUrl}/get-user-id-by-name`,
      {
        params,
        withCredentials: true,
      }
    );
  }

  getUserDetailsByName(name: string): Observable<ApiResponse<User>> {
    const params = new HttpParams().set('name', name);

    return this.http.get<ApiResponse<User>>(
      `${this.baseUrl}/get-user-details-by-name`,
      {
        params,
        withCredentials: true,
      }
    );
  }

  getAllUsers(
    filters: {
      excludeUserId?: string;
      role?: string;
      search?: string;
      limit?: number;
      offset?: number;
      is_approved?: boolean;
      can_manage_users?: boolean;
      deleted?: boolean;
    } = {}
  ): Observable<ApiResponse<User[]>> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ApiResponse<User[]>>(
      `${this.baseUrl}/get-all-users`,
      {
        params,
        withCredentials: true,
      }
    );
  }

  /**
   * -----------------------------------
   * STATS
   * -----------------------------------
   */
  getTotalUsersByRole(
    role = 'user'
  ): Observable<ApiResponse<{ total: number }>> {
    const params = new HttpParams().set('role', role);

    return this.http.get<ApiResponse<{ total: number }>>(
      `${this.baseUrl}/get-total-users-by-role`,
      {
        params,
        withCredentials: true,
      }
    );
  }

  getAdminStats(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.baseUrl}/get-admin-stats`,
      {
        withCredentials: true,
      }
    );
  }

  /**
   * -----------------------------------
   * UPDATE OPERATIONS
   * -----------------------------------
   */
  updatePassword(
    userId: string,
    password: string
  ): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
      `${this.baseUrl}/update-password/${userId}`,
      { password },
      {
        withCredentials: true,
      }
    );
  }

  toggleIsApproved(
    userId: string,
    value: boolean
  ): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
      `${this.baseUrl}/toggle-is-approved/${userId}`,
      { value },
      {
        withCredentials: true,
      }
    );
  }

  toggleCanManageUsers(
    userId: string,
    value: boolean
  ): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
      `${this.baseUrl}/toggle-can-manage-users/${userId}`,
      { value },
      {
        withCredentials: true,
      }
    );
  }

  toggleDeleted(
    userId: string,
    value: boolean
  ): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
      `${this.baseUrl}/toggle-deleted/${userId}`,
      { value },
      {
        withCredentials: true,
      }
    );
  }

  changeUserRole(
    userId: string,
    role: string
  ): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
      `${this.baseUrl}/change-user-role/${userId}`,
      { role },
      {
        withCredentials: true,
      }
    );
  }

  updateUserData(payload: {
    userIds: string | string[];
    data: any;
  }): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
      `${this.baseUrl}/update-user-data`,
      payload,
      {
        withCredentials: true,
      }
    );
  }

  /**
   * -----------------------------------
   * DELETE OPERATIONS
   * -----------------------------------
   */
  deleteUsers(
    userIds: string | string[]
  ): Observable<ApiResponse> {
    return this.http.request<ApiResponse>(
      'DELETE',
      `${this.baseUrl}/delete-users`,
      {
        body: { userIds },
        withCredentials: true,
      }
    );
  }

  softDeleteUsers(
    userIds: string | string[]
  ): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
      `${this.baseUrl}/soft-delete-users`,
      { userIds },
      {
        withCredentials: true,
      }
    );
  }

  deleteUnapprovedUsers(): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.baseUrl}/delete-unapproved-users`,
      {
        withCredentials: true,
      }
    );
  }

  deleteSoftDeletedUsers(): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.baseUrl}/delete-soft-deleted-users`,
      {
        withCredentials: true,
      }
    );
  }
}