import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';


// ================= API RESPONSE =================

export interface StudentApiResponse {
  success: boolean;
  message: string;
  data: {
    students: any[];
  };
}


// ================= FILTER TYPE =================

export interface StudentFilters {
  class_id?: number[] | number;
  section?: string[] | string;
  status?: string[] | string;
  payment_status?: string[] | string;
  student_name?: string;
  parent_name?: string;
}


// ================= SERVICE =================

@Injectable({
  providedIn: 'root',
})
export class ViewStudentsService {

  // ======================================================
  // BASE URL (FIXED)
  // ======================================================
  private readonly baseUrl = `${environment.apiUrl}/students`;

  constructor(private http: HttpClient) {}

  // ======================================================
  // GET STUDENTS BY ACADEMIC YEAR
  // ======================================================
  getStudentsByAcademicYear(
    academicYearId: number | string,
    filters: StudentFilters = {}
  ): Observable<StudentApiResponse> {

    let params = new HttpParams();

    // Helper function for clean param handling
    const setParam = (key: string, value: any) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(
          key,
          Array.isArray(value) ? value.join(',') : String(value)
        );
      }
    };

    setParam('class_id', filters.class_id);
    setParam('section', filters.section);
    setParam('status', filters.status);
    setParam('payment_status', filters.payment_status);
    setParam('student_name', filters.student_name);
    setParam('parent_name', filters.parent_name);

    return this.http.get<StudentApiResponse>(
      `${this.baseUrl}/students/${academicYearId}`,
      { params }
    );
  }
}