// src/app/shared/sidebar/services/about-editor.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponse, AboutBlock } from '../../../core/services/website';

@Injectable({ providedIn: 'root' })
export class AboutEditorService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/website/about`;

  getDraft(): Observable<ApiResponse<AboutBlock[]>> {
    return this.http.get<ApiResponse<AboutBlock[]>>(`${this.base}/draft`);
  }

  createBlock(payload: { textContent: string; displayOrder: number }): Observable<ApiResponse<AboutBlock>> {
    return this.http.post<ApiResponse<AboutBlock>>(`${this.base}/blocks`, payload);
  }

  updateBlock(id: number, changes: Partial<{ textContent: string; displayOrder: number }>): Observable<ApiResponse<AboutBlock>> {
    return this.http.put<ApiResponse<AboutBlock>>(`${this.base}/blocks/${id}`, changes);
  }

  deleteBlock(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.base}/blocks/${id}`);
  }

  publish(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.base}/publish`, {});
  }

  discardDraft(): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.base}/discard-draft`, {});
  }
}
