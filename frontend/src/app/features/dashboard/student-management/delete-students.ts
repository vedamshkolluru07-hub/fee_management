// src/app/services/delete-students.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment.development';


// ================= RESPONSE INTERFACES =================

export interface Student {
  student_id: string;
  student_name: string;
  sur_name: string;

  dob?: string | null;

  gender?: 'Male' | 'Female' | 'Other';

  section?: 'A' | 'B';

  email_id?: string | null;

  admission_date?: string | null;

  is_connected?: boolean;

  status?: 'Active' | 'Inactive' | 'Graduated';
}

export interface DeleteStudentResponse {
  success: boolean;
  message: string;
  data: Student;
}


// ================= SERVICE =================

@Injectable({
  providedIn: 'root',
})
export class DeleteStudentsService {

  // ================= HTTP INJECTION =================
  private readonly http = inject(HttpClient);

  // ================= BASE URL =================
  private readonly BASE_URL = `${environment.apiUrl}/students`;

  // ======================================================
  // DELETE STUDENT
  // ======================================================
  deleteStudent(studentId: string): Observable<DeleteStudentResponse> {
    return this.http
      .delete<DeleteStudentResponse>(
        `${this.BASE_URL}/delete/${studentId}`
      )
      .pipe(
        catchError((error: HttpErrorResponse) => {
          console.error('Delete Student API Error:', error);

          const message =
            error?.error?.message || 'Failed to delete student';

          return throwError(() => new Error(message));
        })
      );
  }
}