import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class StudentStateService {

  private selectedStudentSubject =
    new BehaviorSubject<any>(null);

  selectedStudent$ =
    this.selectedStudentSubject.asObservable();


  setSelectedStudent(student: any): void {
    this.selectedStudentSubject.next(student);
  }


  getSelectedStudent(): any {
    return this.selectedStudentSubject.value;
  }


  clearStudent(): void {
    this.selectedStudentSubject.next(null);
  }

}