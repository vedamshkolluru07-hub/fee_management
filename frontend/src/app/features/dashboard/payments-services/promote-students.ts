// promote-students.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment.development';


// ================= TYPES =================

export interface PromoteStudentsRequest {
  prevYearId: number;
  nextYearId: number;
  studentIds: string[] | number[];

  studentStatusMap?: Record<string, string>;
  doublePromotions?: Record<string, string | boolean>;
}

export interface PromoteStudentResult {
  studentId: string | number;
  from?: string;
  to?: string;
  mode?: string;
  status?: string;
}

export interface PromoteStudentsResponse {
  success: boolean;
  message: string;
  data: PromoteStudentResult[];
}


// ================= SERVICE =================

@Injectable({
  providedIn: 'root',
})
export class PromoteStudentsService {

  // ======================================================
  // BASE URL (FIXED USING ENVIRONMENT)
  // ======================================================
  private readonly baseUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  // ======================================================
  // PROMOTE STUDENTS
  // POST /api/students/promote
  // ======================================================
  promoteStudents(
    payload: PromoteStudentsRequest
  ): Observable<PromoteStudentsResponse> {
    return this.http.post<PromoteStudentsResponse>(
      `${this.baseUrl}/students/promote-students`,
      payload
    );
  }
}