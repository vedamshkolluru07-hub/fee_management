import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';


// ================= GENERIC API RESPONSE =================

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}


// ================= SERVICE =================

@Injectable({
  providedIn: 'root',
})
export class StudentService {

  // ======================================================
  // BASE URL (FIXED USING ENVIRONMENT)
  // ======================================================
  private readonly baseUrl = `${environment.apiUrl}/students`;

  constructor(private http: HttpClient) {}

  // ======================================================
  // 1. UPDATE STUDENT
  // PUT /api/students/:student_id
  // ======================================================
  updateStudent(
    student_id: string,
    payload: any
  ): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.baseUrl}/${student_id}`,
      payload
    );
  }

  // ======================================================
  // 2. DELETE STUDENT
  // DELETE /api/students/:student_id
  // ======================================================
  deleteStudent(student_id: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(
      `${this.baseUrl}/${student_id}`
    );
  }

  // ======================================================
  // 3. GET STUDENT RELATIONS
  // GET /api/students/:student_id/relations
  // ======================================================
  getStudentRelations(student_id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(
      `${this.baseUrl}/${student_id}/relations`
    );
  }

  // ======================================================
  // 4. UPDATE PARENT
  // PUT /api/students/parent/:parents_id
  // ======================================================
  updateParent(
    parents_id: string,
    payload: any
  ): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(
      `${this.baseUrl}/parent/${parents_id}`,
      payload
    );
  }

  // ======================================================
  // 5. GET PARENT RELATIONS
  // GET /api/students/parent/:parents_id/relations
  // ======================================================
  getParentRelations(parents_id: string): Observable<ApiResponse> {
    return this.http.get<ApiResponse>(
      `${this.baseUrl}/parent/${parents_id}/relations`
    );
  }
}