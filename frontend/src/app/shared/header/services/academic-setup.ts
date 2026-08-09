import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

/* ======================================================
   BASE URL (FIXED - NO HARD CODE)
====================================================== */
const BASE_URL = `${environment.apiUrl}/academicManagement`;

/* ======================================================
   TYPES
====================================================== */

export interface BookPayload {
  bookType: string;
  bookAmount?: number;
}

export interface ClassPayload {
  className: string;
  feeAmount?: number;
  books?: BookPayload[];
}

export interface UniformPayload {
  gender: 'Male' | 'Female';
  uniformType: string;
  size?: string | null;
  uniformAmount?: number;
}

export interface AcademicYearPayload {
  yearLabel: string;
  startDate: string;
  endDate?: string | null;
  isCurrentYear?: boolean;
}

export interface AcademicSetupPayload {
  academicYear: AcademicYearPayload;
  classes?: ClassPayload[];
  uniforms?: UniformPayload[];
}

/* ======================================================
   API RESPONSE
====================================================== */

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

/* ======================================================
   SERVICE
====================================================== */

@Injectable({
  providedIn: 'root',
})
export class AcademicSetupService {
  private http = inject(HttpClient);

  createClassesForAcademicYear(
    academicYearId: number,
    classes: ClassPayload[]
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${BASE_URL}/academic-years/${academicYearId}/classes`,
      { classes }
    );
  }

  createBooksForClass(
    classId: number,
    books: BookPayload[]
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${BASE_URL}/classes/${classId}/books`,
      { books }
    );
  }

  createClassesAndBooks(
    academicYearId: number,
    classes: ClassPayload[]
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${BASE_URL}/academic-years/${academicYearId}/classes-with-books`,
      { classes }
    );
  }

  createUniformsForAcademicYear(
    academicYearId: number,
    uniforms: UniformPayload[]
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${BASE_URL}/academic-years/${academicYearId}/uniforms`,
      { uniforms }
    );
  }

  createAcademicSetup(
    payload: AcademicSetupPayload
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${BASE_URL}/academic-setup`,
      payload
    );
  }
}