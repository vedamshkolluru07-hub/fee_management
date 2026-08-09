import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

/* ======================================================
   BASE URL
====================================================== */
const BASE_URL = `${environment.apiUrl}/academicManagement/update`;

/* ======================================================
   API RESPONSE
====================================================== */

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

/* ======================================================
   SERVICE
====================================================== */

@Injectable({
  providedIn: 'root'
})
export class AcademicUpdateService {

  private http = inject(HttpClient);

  // ======================================================
  // ACADEMIC YEARS
  // ======================================================

  updateAcademicYear(payload: {
    id: number | number[];
    data: any | any[];
  }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${BASE_URL}/academic-year`,
      payload,
      { withCredentials: true }
    );
  }

  // ======================================================
  // CLASSES
  // ======================================================

  updateClasses(payload: {
    id: number | number[];
    data: any | any[];
  }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${BASE_URL}/classes`,
      payload,
      { withCredentials: true }
    );
  }

  // ======================================================
  // BOOKS
  // ======================================================

  updateBooks(payload: {
    id: number | number[];
    data: any | any[];
  }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${BASE_URL}/books`,
      payload,
      { withCredentials: true }
    );
  }

  // ======================================================
  // UNIFORMS
  // ======================================================

  updateUniforms(payload: {
    id: number | number[];
    data: any | any[];
  }): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${BASE_URL}/uniforms`,
      payload,
      { withCredentials: true }
    );
  }
}