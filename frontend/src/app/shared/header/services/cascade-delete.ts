import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

/* ======================================================
   BASE URL
====================================================== */
const BASE_URL = `${environment.apiUrl}/academicManagement/`;

/* ======================================================
   REQUEST / RESPONSE TYPES
====================================================== */

export interface CascadeDeleteRequest {
  academicYearIds?: number[];
  classIds?: number[];
  bookIds?: number[];
  uniformIds?: number[];
  forceDelete?: boolean;
}

export interface CascadeDeleteResponse {
  success: boolean;
  message: string;
  summary?: {
    deletedCount: number;
    blockedCount: number;
    forceDelete: boolean;
  };
  deleted: {
    books: number[];
    uniforms: number[];
    classes: number[];
    academicYears: number[];
  };
  blocked: {
    books: number[];
    uniforms: number[];
    classes: number[];
    academicYears: number[];
  };
  debug?: any[];
  error?: string;
}

/* ======================================================
   SERVICE
====================================================== */

@Injectable({
  providedIn: 'root'
})
export class CascadeDeleteService {

  private http = inject(HttpClient);

  /**
   * Cascade delete across Academic system
   */
  cascadeDelete(payload: CascadeDeleteRequest): Observable<CascadeDeleteResponse> {
    return this.http.post<CascadeDeleteResponse>(
      BASE_URL,
      payload
    );
  }
}