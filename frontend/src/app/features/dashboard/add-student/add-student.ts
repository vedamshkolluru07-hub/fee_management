import {
  Component,
  OnInit,
  ChangeDetectorRef,
  DestroyRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { StudentEnrollmentService } from '../student-management/enrollment';
import { AcademicState } from '../../../shared/header/academic-state';
import { AcademicYear, Class } from '../../../shared/header/services/academic-read';

interface StudentForm {
  academic_year_id: number | null;
  class_id: number | null;

  student_id: string;
  student_name: string;
  dob: string;
  gender: string | null;
  section: string;
  email_id: string;
  admission_date: string;
  status: string;

  contact_number: string;

  fathers_first_name: string;
  fathers_sur_name: string;
  mothers_first_name: string;
  mothers_sur_name: string;

  secondary_contact_number: string;
  email: string;
  address: string;
  occupation: string;
  relationship: string | null;

  concession: number;
  amount_paid: number;
  payment_method: string | null;
  due_date: string;
}

@Component({
  selector: 'app-add-student',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-student.html',
  styleUrls: ['./add-student.css'],
})
export class AddStudent implements OnInit {

  private destroyRef = inject(DestroyRef);

  constructor(
    private enrollmentService: StudentEnrollmentService,
    private academicState: AcademicState,
    private cdr: ChangeDetectorRef
  ) {}

  // ================= FORM =================
  form: StudentForm = this.getInitialForm();

  // ================= STATE =================
  loading = false;
  message = '';
  isSuccess = false;

  studentId: string | null = null;
  paymentId: string | null = null;

  age = 0;

  academicYears: AcademicYear[] = [];
  classes: Class[] = [];
  selectedYear: AcademicYear | null = null;

  fee_amount = 0;
  totalFee = 0;
  pendingAmount = 0;

  // ================= INIT =================
  ngOnInit(): void {

    this.academicState.academicYears$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        this.academicYears = data || [];
        this.cdr.markForCheck();
      });

    this.academicState.classes$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(data => {
        this.classes = data || [];
        this.cdr.markForCheck();
      });

    // safety net: populate state if this page is opened directly and
    // Header (or another entry point) hasn't loaded years yet
    if (!this.academicState.academicYearsSnapshot.length) {
      this.academicState
        .loadAcademicYears()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: (err) => console.error('Failed loading academic years:', err)
        });
    }
  }

  // ================= INITIAL FORM =================
  private getInitialForm(): StudentForm {
    return {
      academic_year_id: null,
      class_id: null,

      student_id: '',
      student_name: '',
      dob: '',
      gender: null,
      section: 'A',
      email_id: '',
      admission_date: '',
      status: 'Active',

      contact_number: '',

      fathers_first_name: '',
      fathers_sur_name: '',
      mothers_first_name: '',
      mothers_sur_name: '',

      secondary_contact_number: '',
      email: '',
      address: '',
      occupation: '',
      relationship: null,

      concession: 0,
      amount_paid: 0,
      payment_method: null,
      due_date: ''
    };
  }

  // ================= ACADEMIC YEAR =================
  onAcademicYearChange(): void {

    this.selectedYear =
      this.academicYears.find(
        y => y.academicYearId === this.form.academic_year_id
      ) || null;

    this.form.class_id = null;
    this.resetFee();

    if (!this.form.academic_year_id) {
      this.academicState.setClasses([]);
      return;
    }

    // pull full year payload (classes/books/uniforms) for the chosen year
    this.academicState
      .loadAcademicYearFull(this.form.academic_year_id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        error: (err) => console.error('Failed loading academic year data:', err)
      });
  }

  // ================= CLASS =================
  onClassChange(): void {
    const cls =
      this.classes.find(
        c => c.classId === this.form.class_id
      ) || null;

    this.fee_amount = cls?.feeAmount ?? 0;
    this.calculateTotalFee();
  }

  // ================= AGE =================
  calculateAge(): void {
    if (!this.form.dob) {
      this.age = 0;
      return;
    }

    const birth = new Date(this.form.dob);
    const today = new Date();

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    this.age = age;
  }

  // ================= FEES =================
  calculateTotalFee(): void {
    const concession = Number(this.form.concession || 0);
    this.totalFee = Math.max(this.fee_amount - concession, 0);
    this.calculatePending();
  }

  calculatePending(): void {
    const paid = Number(this.form.amount_paid || 0);
    this.pendingAmount = Math.max(this.totalFee - paid, 0);
  }

  private resetFee(): void {
    this.fee_amount = 0;
    this.totalFee = 0;
    this.pendingAmount = 0;
  }

  // ================= SUBMIT =================
  submitForm(): void {
    if (this.loading) return;

    this.loading = true;
    this.message = '';
    this.isSuccess = false;

    const payload = this.buildPayload();

    this.enrollmentService.createStudentEnrollment(payload).subscribe({
      next: (res: any) => {
        this.loading = false;

        if (res?.success) {
          this.isSuccess = true;
          this.message = res.message || 'Student created successfully';

          this.studentId = res.data?.student_id ?? null;
          this.paymentId = res.data?.payment_id ?? null;
        } else {
          this.isSuccess = false;
          this.message = res?.message || 'Failed';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.isSuccess = false;
        this.message = err?.error?.message || 'Server error';
        this.cdr.markForCheck();
      }
    });
  }

  // ================= PAYLOAD MAPPING =================
  private buildPayload(): any {
    return {
      academic_year_id: this.form.academic_year_id,
      class_id: this.form.class_id,

      student_id: this.form.student_id,
      student_name: this.form.student_name,
      dob: this.form.dob,
      gender: this.form.gender,
      section: this.form.section,
      email_id: this.form.email_id,
      admission_date: this.form.admission_date,
      status: this.form.status,

      contact_number: this.form.contact_number,

      fathers_first_name: this.form.fathers_first_name,
      fathers_sur_name: this.form.fathers_sur_name,
      mothers_first_name: this.form.mothers_first_name,
      mothers_sur_name: this.form.mothers_sur_name,

      secondary_contact_number: this.form.secondary_contact_number,
      email: this.form.email,
      address: this.form.address,
      occupation: this.form.occupation,
      relationship: this.form.relationship,

      concession: this.form.concession,
      amount_paid: this.form.amount_paid,
      payment_method: this.form.payment_method,
      due_date: this.form.due_date,

      remarks: 'Student Enrollment'
    };
  }

  // ================= RESET =================
  resetForm(): void {
    this.form = this.getInitialForm();

    this.studentId = null;
    this.paymentId = null;
    this.message = '';
    this.isSuccess = false;
    this.age = 0;

    this.resetFee();
  }
}