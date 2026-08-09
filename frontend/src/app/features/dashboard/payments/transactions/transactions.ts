import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  StudentClassesService,
  PaymentIdRequest,
  PaymentIdResponse
} from '../../payments-services/studentClass';

import { StudentStateService } from '../../payments-services/student-state.service';

import {
  AcademicReadService,
  AcademicYear,
  Class
} from '../../../../shared/header/services/academic-read';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
  ],
  templateUrl: './transactions.html',
  styles: ''
})
export class Transactions implements OnInit, OnDestroy {

  student: any = null;

  studentId!: number;
  classId!: number;
  academicYearId!: number;

  paymentId: string | null = null;

  selectedAcademicYear: AcademicYear | null = null;
  selectedClass: Class | null = null;

  loading = false;
  error = '';

  private subscriptions = new Subscription();

  constructor(private studentClassesService: StudentClassesService,
    private studentStateService: StudentStateService,
    private academicService: AcademicReadService,
    private router: Router,
    private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {

    const selectedStudent =
      this.studentStateService.getSelectedStudent();

    if (!selectedStudent) {
      this.error = 'No student data found.';
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
      secondary_contact_number:
        selectedStudent.secondary_contact_number ?? '',
      email: selectedStudent.email ?? '',
      address: selectedStudent.address ?? '',
      occupation: selectedStudent.occupation ?? '',
      contact_number: selectedStudent.contact_number ?? '',
      class_id: selectedStudent.class_id ?? null,
      academic_year_id: selectedStudent.academic_year_id ?? null
    };

    this.studentId = this.student.student_id;
    this.classId = this.student.class_id;
    this.academicYearId = this.student.academic_year_id;

    // FIX: previously relied on AcademicState.academicYears$/classes$,
    // which are only populated when the header happens to have loaded
    // a matching academic year first. We now fetch the exact academic
    // year (and its classes) for THIS student directly, so the
    // "Academic Details" / "Class Details" sections are always correct
    // regardless of what's selected in the header.
    this.loadAcademicContext();

    this.validatePaymentData();
  }

  private loadAcademicContext(): void {
    if (!this.academicYearId) {
      return;
    }

    this.academicService.getAcademicYearFull(this.academicYearId).subscribe({
      next: (res) => {
        const data = res?.data;
        if (!data) return;

        this.selectedAcademicYear = data.academicYear ?? null;

        this.selectedClass =
          (data.classes ?? []).find(
            (cls: Class) => cls.classId === this.classId
          ) ?? null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load academic year/class data:', err);
        this.cdr.markForCheck();
      },
    });
  }

  private validatePaymentData(): void {

    if (
      this.studentId &&
      this.classId &&
      this.academicYearId
    ) {
      this.loadPaymentId();
    } else {
      this.error =
        'Required payment information is missing.';
    }
  }

  private loadPaymentId(): void {

    this.loading = true;
    this.error = '';

    const request: PaymentIdRequest = {
      academic_year_id: this.academicYearId,
      class_id: this.classId,
      student_id: this.studentId
    };

    this.studentClassesService
      .getPaymentId(request)
      .subscribe({
        next: (response: PaymentIdResponse): void => {

          this.paymentId =
            response.data.payment_id;

          this.loading = false;

          console.log(
            'Payment ID:',
            this.paymentId
          );
        },

        error: (err: Error): void => {

          this.loading = false;

          this.error = err.message;

          console.error(
            'Failed to fetch payment ID:',
            err
          );
        }
      });
  }

// ================= NAVIGATION =================

goToTution(): void {

  this.studentStateService.setSelectedStudent(this.student);

  this.router.navigate(['/payments/view-tution'], {
    queryParams: {
      paymentId: this.paymentId,
      academicYearId: this.academicYearId,
      classId: this.classId,
      studentId: this.studentId
    }
  });

}


goToBooks(): void {

  this.studentStateService.setSelectedStudent(this.student);

  this.router.navigate(['/payments/view-books'], {
    queryParams: {
      paymentId: this.paymentId,
      academicYearId: this.academicYearId,
      classId: this.classId,
      studentId: this.studentId
    }
  });

}


goToUniform(): void {

  this.studentStateService.setSelectedStudent(this.student);

  this.router.navigate(['/payments/view-unifrom'], {
    queryParams: {
      paymentId: this.paymentId,
      academicYearId: this.academicYearId,
      classId: this.classId,
      studentId: this.studentId
    }
  });

}

family_Pending(): void {

  this.studentStateService.setSelectedStudent(this.student);

  this.router.navigate(['/student-model'],{
    queryParams: {
      academicYearId: this.academicYearId,
      classId: this.classId,
      studentId: this.studentId
    }
  });
}

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}