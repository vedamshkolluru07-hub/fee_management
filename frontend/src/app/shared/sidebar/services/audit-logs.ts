import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AuditLog {
  log_id: string;
  actor_user_id: string;
  action: string;
  role_at_time: string;
  category: 'create' | 'read' | 'update' | 'delete';
  log_message: string;
  target_user_id: string;
  target_entity_type: 'user' | 'student';
  changes: any;
  success: boolean;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface AuditLogFilters {
  category?: string;
  target_entity_type?: string;
  action?: string;
  success?: boolean;
  target_user_id?: string;
  actor_user_id?: string;
  role_at_time?: string;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuditLogsService {
  private http = inject(HttpClient);

  private baseUrl = '/audit-logs';

  /**
   * ======================================================
   * GET AUDIT LOGS (FILTERED + PAGINATED)
   * ======================================================
   */
  getAuditLogs(filters: AuditLogFilters = {}): Observable<ApiResponse<AuditLog[]>> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        params = params.set(key, String(value));
      }
    });

    return this.http.get<ApiResponse<AuditLog[]>>(this.baseUrl, { params });
  }

  /**
   * ======================================================
   * UPDATE AUDIT LOG
   * ======================================================
   */
  updateAuditLog(
    logId: string,
    updates: Partial<AuditLog>
  ): Observable<ApiResponse<AuditLog>> {
    return this.http.put<ApiResponse<AuditLog>>(
      `${this.baseUrl}/${logId}`,
      updates
    );
  }

  /**
   * ======================================================
   * DELETE AUDIT LOGS (BULK)
   * ======================================================
   */
  deleteAuditLogs(logIds: string[]): Observable<ApiResponse<string[]>> {
    return this.http.delete<ApiResponse<string[]>>(this.baseUrl, {
      body: { logIds },
    });
  }
}