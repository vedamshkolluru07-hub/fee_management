import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

/* ======================================================
   🔹 NOTIFICATION ITEM TYPE
====================================================== */
export interface NotificationItem {
  notification_id: string;

  user_id: string;

  title: string;
  message: string;

  type: string;

  is_read: boolean;

  created_at: string;
  read_at?: string | null;
}

/* ======================================================
   🔹 PAGINATION TYPE
====================================================== */
export interface NotificationPagination {
  limit: number;
  offset: number;

  total: number;
  count: number;

  has_more: boolean;
}

/* ======================================================
   🔹 NOTIFICATIONS RESPONSE
====================================================== */
export interface NotificationsResponse {
  success: boolean;

  data: {
    notifications: NotificationItem[];
    pagination: NotificationPagination;
    unread_count: number;
  };
}

/* ======================================================
   🔹 UNREAD COUNT RESPONSE
====================================================== */
export interface UnreadCountResponse {
  success: boolean;
  unread_count: number;
}

/* ======================================================
   🔹 GENERIC API RESPONSE
====================================================== */
export interface ApiResponse {
  success: boolean;
  message?: string;
}

/* ======================================================
   🔹 NOTIFICATIONS SERVICE
====================================================== */
@Injectable({
  providedIn: 'root',
})
export class NotificationsService {
  /* ======================================================
     🔹 DEPENDENCIES
  ====================================================== */
  private http = inject(HttpClient);

  /* ======================================================
     🔹 BASE URL
  ====================================================== */
  private baseUrl = `${environment.apiUrl}/notifications`;

  /* ======================================================
     🔹 GET NOTIFICATIONS
     (user_id removed — backend derives it from the session)
  ====================================================== */
  getNotifications(
    filters: {
      type?: string;
      read?: boolean;
      search?: string;
      start_date?: string;
      end_date?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Observable<NotificationsResponse> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<NotificationsResponse>(
      `${this.baseUrl}`,
      {
        params,
        withCredentials: true,
      }
    );
  }

  /* ======================================================
     🔹 GET UNREAD COUNT
     (user_id removed — backend derives it from the session)
  ====================================================== */
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(
      `${this.baseUrl}/unread-count`,
      {
        withCredentials: true,
      }
    );
  }

  /* ======================================================
     🔹 MARK MULTIPLE AS READ
  ====================================================== */
  markMultipleAsRead(
    ids: string[]
  ): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
      `${this.baseUrl}/mark-read`,
      { ids },
      {
        withCredentials: true,
      }
    );
  }

  /* ======================================================
     🔹 MARK BY TYPE AS READ
     (user_id removed — backend derives it from the session)
  ====================================================== */
  markByTypeAsRead(
    type: string
  ): Observable<ApiResponse> {
    return this.http.patch<ApiResponse>(
      `${this.baseUrl}/mark-by-type`,
      {
        type,
      },
      {
        withCredentials: true,
      }
    );
  }

  /* ======================================================
     🔹 DELETE SINGLE NOTIFICATION
  ====================================================== */
  deleteNotification(
    notification_id: string
  ): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.baseUrl}/${notification_id}`,
      {
        withCredentials: true,
      }
    );
  }

  /* ======================================================
     🔹 DELETE BULK NOTIFICATIONS
  ====================================================== */
  deleteBulk(
    ids: string[]
  ): Observable<ApiResponse> {
    return this.http.request<ApiResponse>(
      'DELETE',
      `${this.baseUrl}/bulk`,
      {
        body: { ids },
        withCredentials: true,
      }
    );
  }
}