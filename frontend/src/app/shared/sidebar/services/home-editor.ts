// src/app/shared/sidebar/services/home-editor.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponse, HomeBlock, HomeBlockImage } from '../../../core/services/website';

@Injectable({ providedIn: 'root' })
export class HomeEditorService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/website/home`;
  private uploadUrl = `${environment.apiUrl}/website/upload/images`;

  getDraft(): Observable<ApiResponse<HomeBlock[]>> {
    return this.http.get<ApiResponse<HomeBlock[]>>(`${this.base}/draft`);
  }

  createBlock(payload: Partial<HomeBlock> & { blockType: 'text' | 'image' }): Observable<ApiResponse<HomeBlock>> {
    return this.http.post<ApiResponse<HomeBlock>>(`${this.base}/blocks`, payload);
  }

  updateBlock(id: number, changes: Partial<HomeBlock>): Observable<ApiResponse<HomeBlock>> {
    return this.http.put<ApiResponse<HomeBlock>>(`${this.base}/blocks/${id}`, changes);
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

  uploadImages(files: File[], folder: 'homepage' | 'about' = 'homepage'): Observable<ApiResponse<HomeBlockImage[]>> {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    formData.append('folder', folder);
    return this.http.post<ApiResponse<HomeBlockImage[]>>(this.uploadUrl, formData);
  }
}
