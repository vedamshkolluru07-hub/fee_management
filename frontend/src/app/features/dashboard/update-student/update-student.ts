import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { StudentStateService } from '../payments-services/student-state.service';
import { StudentService } from '../student-management/update-students';
import { DeleteStudentsService } from '../student-management/delete-students';

@Component({
  selector: 'app-update-student',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './update-student.html',
  styleUrl: './update-student.css',
})
export class UpdateStudent implements OnInit {

  student: any = null;

  error = '';
  successMessage = '';
  age = 0;

  constructor(private router: Router,
    private studentService: StudentService,
    private deleteStudentsService: DeleteStudentsService,
    private studentStateService: StudentStateService,
    private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {

    const selectedStudent = this.studentStateService.getSelectedStudent();

    if (!selectedStudent) {
      this.error = 'No student data found';
      return;
    }

    this.student = {
      student_id: selectedStudent.student_id ?? null,
      student_name: selectedStudent.student_name ?? '',
      sur_name: selectedStudent.sur_name ?? '',
      dob: selectedStudent.dob ?? null,
      gender: selectedStudent.gender ?? '',
      section: selectedStudent.section ?? '',
      email_id: selectedStudent.email_id ?? '',

      parents_id: selectedStudent.parents_id ?? null,
      fathers_first_name: selectedStudent.fathers_first_name ?? '',
      fathers_sur_name: selectedStudent.fathers_sur_name ?? '',
      mothers_first_name: selectedStudent.mothers_first_name ?? '',
      mothers_sur_name: selectedStudent.mothers_sur_name ?? '',
      secondary_contact_number: selectedStudent.secondary_contact_number ?? '',
      email: selectedStudent.email ?? '',
      address: selectedStudent.address ?? '',
      occupation: selectedStudent.occupation ?? '',
      contact_number: selectedStudent.contact_number ?? ''
    };

    this.calculateAge();
  }

  calculateAge(): void {

    if (!this.student?.dob) {
      this.age = 0;
      return;
    }

    const dob = new Date(this.student.dob);
    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();

    const monthDifference = today.getMonth() - dob.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < dob.getDate())
    ) {
      age--;
    }

    this.age = age;
  }

  // ================= UPDATE =================

  saveAll(): void {

    this.error = '';
    this.successMessage = '';

    const studentPayload = {
      student_name: this.student.student_name,
      sur_name: this.student.sur_name,
      dob: this.student.dob,
      gender: this.student.gender,
      section: this.student.section,
      email_id: this.student.email_id
    };

    const parentPayload = {
      fathers_first_name: this.student.fathers_first_name,
      fathers_sur_name: this.student.fathers_sur_name,
      mothers_first_name: this.student.mothers_first_name,
      mothers_sur_name: this.student.mothers_sur_name,
      contact_number: this.student.contact_number,
      secondary_contact_number: this.student.secondary_contact_number,
      email: this.student.email,
      address: this.student.address,
      occupation: this.student.occupation
    };

    this.studentService
      .updateStudent(this.student.student_id, studentPayload)
      .subscribe({
        next: (studentResponse) => {

          if (!studentResponse.success) {
            this.error = studentResponse.message;
            return;
          }

          this.studentService
            .updateParent(this.student.parents_id, parentPayload)
            .subscribe({
              next: (parentResponse) => {

                if (parentResponse.success) {

                  this.studentStateService.setSelectedStudent({
                    ...this.student
                  });

                  this.successMessage = 'Student updated successfully';

                } else {
                  this.error = parentResponse.message;
                }
              },
              error: (err) => {
                this.error = err.message;
              }
            });

this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err.message;
          this.cdr.markForCheck();
        }
      });
  }

  // ================= DELETE (StudentService) =================

  deleteStudentViaStudentService(): void {

    if (!this.student?.student_id) {
      this.error = 'Invalid student ID';
      return;
    }

    this.studentService
      .deleteStudent(this.student.student_id)
      .subscribe({
        next: (response) => {

          if (response.success) {

            this.studentStateService.clearStudent();

            this.successMessage = 'Deleted successfully';

            this.router.navigate(['/students']);

          } else {
            this.error = response.message;
          }
this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err.message;
          this.cdr.markForCheck();
        }
      });
  }

  // ================= DELETE (DeleteStudentsService) =================

  deleteStudentViaDeleteService(): void {

    if (!this.student?.student_id) {
      this.error = 'Invalid student ID';
      return;
    }

    this.deleteStudentsService
      .deleteStudent(this.student.student_id)
      .subscribe({
        next: (response) => {

          if (response.success) {

            this.studentStateService.clearStudent();

            this.successMessage = 'Deleted successfully';

            this.router.navigate(['/students']);

          } else {
            this.error = response.message || 'Delete failed';
          }
this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err.message;
          this.cdr.markForCheck();
        }
      });
  }
}