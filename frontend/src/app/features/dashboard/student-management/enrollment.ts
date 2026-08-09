import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';

@Injectable({
  providedIn: 'root'
})
export class StudentEnrollmentService {

  // Use environment config instead of hardcoded URL
  private baseUrl = `${environment.apiUrl}/students`;

  constructor(private http: HttpClient) {}

  // ======================================================
  // SINGLE STUDENT ENROLLMENT
  // ======================================================
  createStudentEnrollment(payload: any): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/create`,
      payload
    );
  }

  // ======================================================
  // BULK STUDENT UPLOAD
  // ======================================================
  uploadBulkStudents(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<any>(
      `${this.baseUrl}/upload`,
      formData
    );
  }

  // ======================================================
  // MANUAL BULK STUDENT UPLOAD
  // ======================================================
  uploadManualStudents(students: any[]): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/manual-upload`,
      {
        students
      }
    );
  }

  // ======================================================
  // OPTIONAL: GET ALL STUDENTS
  // ======================================================
  getStudents(): Observable<any> {
    return this.http.get<any>(
      `${this.baseUrl}`
    );
  }

  // ======================================================
  // OPTIONAL: DELETE STUDENT
  // ======================================================
  deleteStudent(studentId: string): Observable<any> {
    return this.http.delete<any>(
      `${this.baseUrl}/${studentId}`
    );
  }
}