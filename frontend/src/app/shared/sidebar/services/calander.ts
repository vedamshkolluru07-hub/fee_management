import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

@Injectable({
  providedIn: 'root',
})
export class CalendarApiService {
  private baseUrl = '/api'; // adjust to your backend URL

  constructor(private http: HttpClient) {}

  // ======================================================
  // 🔵 CALENDAR EVENTS (calendarService backend)
  // ======================================================

  createEvent(payload: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.baseUrl}/events`,
      payload
    );
  }

  getEvents(filters: any = {}): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();

    Object.keys(filters).forEach((key) => {
      if (filters[key] !== null && filters[key] !== undefined) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<ApiResponse<any[]>>(
      `${this.baseUrl}/events`,
      { params }
    );
  }

  getEventById(eventId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.baseUrl}/events/${eventId}`
    );
  }

  getUpcoming15Days(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.baseUrl}/events/upcoming-15-days`
    );
  }

  getLoginAlerts(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.baseUrl}/events/login-alerts`
    );
  }

  getRecentCompleted(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(
      `${this.baseUrl}/events/recent-completed`
    );
  }

  updateEvent(eventId: number, payload: any): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(
      `${this.baseUrl}/events/${eventId}`,
      payload
    );
  }

  deleteEvent(eventId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.baseUrl}/events/${eventId}`
    );
  }

  deleteBulk(eventIds: number[]): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.baseUrl}/events`,
      { body: { eventIds } }
    );
  }

  // ======================================================
  // 🟠 POSTPONEMENT (postponementService backend)
  // ======================================================

  postponeEvent(
    eventId: number,
    newStartTime: string,
    reason?: string
  ): Observable<ApiResponse<any>> {
    return this.http.patch<ApiResponse<any>>(
      `${this.baseUrl}/events/${eventId}/postpone`,
      {
        new_start_time: newStartTime,
        reason,
      }
    );
  }

  getPostponementHistory(eventId: number): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.baseUrl}/events/${eventId}/postponement-history`
    );
  }

  cleanupPostponements(days?: number): Observable<ApiResponse<any>> {
    let params = new HttpParams();

    if (days !== undefined) {
      params = params.set('days', days);
    }

    return this.http.delete<ApiResponse<any>>(
      `${this.baseUrl}/postponement/cleanup`,
      { params }
    );
  }
}