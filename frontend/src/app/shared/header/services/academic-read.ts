import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';

/* ======================================================
   BASE URL
====================================================== */
const BASE_URL = `${environment.apiUrl}/academicManagement`;

/* ======================================================
   API RESPONSE
====================================================== */

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

/* ======================================================
   TYPE DEFINITIONS
====================================================== */

export interface AcademicYear {
  academicYearId: number;
  yearLabel: string;
  startDate: string;
  endDate?: string;
  isConnected: boolean;
  isCurrentYear: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Class {
  classId: number;
  academicYearId: number;
  className: string;
  feeAmount: number;
  isConnected: boolean;
  isFinanceConnected: boolean;
  createdAt: string;
}

export interface Book {
  bookId: number;
  classId: number;
  bookType: string;
  bookAmount: number;
  isConnected: boolean;
  createdAt: string;
}

export interface Uniform {
  uniformId: number;
  academicYearId: number;
  gender: 'Male' | 'Female';
  uniformType: string;
  size?: string;
  uniformAmount: number;
  isConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AcademicFullResponse {
  academicYear: AcademicYear;
  classes: Class[];
  books: Book[];
  uniforms: Uniform[];
}

export interface UniformFilters {
  academicYearId?: number;
  gender?: string;
  uniformType?: string;
  size?: string;
}

/* ======================================================
   SERVICE
====================================================== */

@Injectable({
  providedIn: 'root',
})
export class AcademicReadService {
  private http = inject(HttpClient);

  getAllAcademicYears(): Observable<ApiResponse<AcademicYear[]>> {
    return this.http.get<ApiResponse<AcademicYear[]>>(
      `${BASE_URL}/all`
    );
  }

  getAcademicYearFull(
    academicYearId: number
  ): Observable<ApiResponse<AcademicFullResponse>> {
    return this.http.get<ApiResponse<AcademicFullResponse>>(
      `${BASE_URL}/academic-year/${academicYearId}/full`
    );
  }

  getAcademicYearById(
    id: number
  ): Observable<ApiResponse<AcademicYear>> {
    return this.http.get<ApiResponse<AcademicYear>>(
      `${BASE_URL}/academic-year/${id}`
    );
  }

  getClassesByAcademicYearId(
    academicYearId: number
  ): Observable<ApiResponse<Class[]>> {
    return this.http.get<ApiResponse<Class[]>>(
      `${BASE_URL}/academic-year/${academicYearId}/classes`
    );
  }

  getBooksByAcademicYearId(
    academicYearId: number
  ): Observable<ApiResponse<Book[]>> {
    return this.http.get<ApiResponse<Book[]>>(
      `${BASE_URL}/academic-year/${academicYearId}/books`
    );
  }

  getUniformsByAcademicYearId(
    academicYearId: number
  ): Observable<ApiResponse<Uniform[]>> {
    return this.http.get<ApiResponse<Uniform[]>>(
      `${BASE_URL}/academic-year/${academicYearId}/uniforms`
    );
  }

  getUniformsByFilters(
    filters: UniformFilters
  ): Observable<ApiResponse<Uniform[]>> {

    let params = new HttpParams();

    if (filters.academicYearId != null) {
      params = params.set('academicYearId', filters.academicYearId);
    }
    if (filters.gender) {
      params = params.set('gender', filters.gender);
    }
    if (filters.uniformType) {
      params = params.set('uniformType', filters.uniformType);
    }
    if (filters.size) {
      params = params.set('size', filters.size);
    }

    return this.http.get<ApiResponse<Uniform[]>>(
      `${BASE_URL}/uniforms`,
      { params }
    );
  }

  getBooksByClassId(
    classId: number
  ): Observable<ApiResponse<Book[]>> {
    return this.http.get<ApiResponse<Book[]>>(
      `${BASE_URL}/class/${classId}/books`
    );
  }
}