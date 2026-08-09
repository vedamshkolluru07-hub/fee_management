import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { StudentEnrollmentService } from '../student-management/enrollment';
import { AcademicState } from '../../../shared/header/academic-state';
import { AcademicYear, Class } from '../../../shared/header/services/academic-read';

interface BulkStudentRow {
  academic_year_id: number | null;
  class_id: number | null;
  student_id: string;
  student_name: string;
  dob: string;
  gender: string;
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
  relationship: string;
  concession: number;
  amount_paid: number;
  payment_method: string;
  due_date: string;
}

@Component({
  selector: 'app-bulk-student',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-student-upload.html',
  styleUrl: './bulk-student-upload.css',
})
export class BulkStudentComponent implements OnInit, OnDestroy {

  private service = inject(StudentEnrollmentService);
  private academicState = inject(AcademicState);
  private cdr = inject(ChangeDetectorRef);

  private destroy$ = new Subject<void>();

  // ================= STATE =================
  students: BulkStudentRow[] = [];
  selectedFile: File | null = null;

  loading = false;
  message = '';
  isSuccess = false;

  studentCount = 1;

  // ============ ACADEMIC YEAR / CLASS ============
  academicYears: AcademicYear[] = [];
  classes: Class[] = [];

  selectedAcademicYearId: number | null = null;
  selectedYear: AcademicYear | null = null;

  // ================= INIT =================
  ngOnInit(): void {
    this.academicState.academicYears$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.academicYears = data || [];
        this.cdr.markForCheck();
      });

    this.academicState.classes$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.classes = data || [];
        this.cdr.markForCheck();
      });

    // safety net: populate state if opened directly, bypassing Header
    if (!this.academicState.academicYearsSnapshot.length) {
      this.academicState
        .loadAcademicYears()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (err) => console.error('Failed loading academic years:', err)
        });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // classes$ is already scoped to the selected academic year (populated via
  // getAcademicYearFull), so no extra client-side filtering is required.
  get filteredClasses(): Class[] {
    return this.classes;
  }

  // ================= ACADEMIC YEAR CHANGE =================
  onAcademicYearChange(): void {
    this.selectedYear =
      this.academicYears.find(
        (y) => y.academicYearId === this.selectedAcademicYearId
      ) || null;

    this.students.forEach((row) => {
      row.academic_year_id = this.selectedAcademicYearId;
      row.class_id = null;
    });

    if (!this.selectedAcademicYearId) {
      this.academicState.setClasses([]);
      return;
    }

    this.academicState
      .loadAcademicYearFull(this.selectedAcademicYearId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('Failed loading academic year data:', err)
      });
  }

  // ================= ADD ROWS =================
  addRows(count: number): void {
    if (!count || count < 1) return;

    for (let i = 0; i < count; i++) {
      this.students.push({
        academic_year_id: this.selectedAcademicYearId,
        class_id: null,
        student_id: '',
        student_name: '',
        dob: '',
        gender: '',
        section: '',
        email_id: '',
        admission_date: '',
        status: '',
        contact_number: '',
        fathers_first_name: '',
        fathers_sur_name: '',
        mothers_first_name: '',
        mothers_sur_name: '',
        secondary_contact_number: '',
        email: '',
        address: '',
        occupation: '',
        relationship: '',
        concession: 0,
        amount_paid: 0,
        payment_method: '',
        due_date: ''
      });
    }
  }

  // ================= REMOVE ROW =================
  removeRow(index: number): void {
    this.students.splice(index, 1);
  }

  // ================= FILE SELECT =================
  onFileSelected(event: any): void {
    this.selectedFile = event.target.files?.[0] || null;
  }

  // ================= UPLOAD FILE =================
  uploadFile(): void {
    if (!this.selectedFile) return;

    this.loading = true;
    this.message = '';
    this.isSuccess = false;

    this.service.uploadBulkStudents(this.selectedFile).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.isSuccess = !!res?.success && !res?.failed?.length;
        this.message = res?.message || 'Uploaded';

        if (res?.inserted?.length) {
          this.message += ` | Inserted: ${res.inserted.length}`;
        }

        if (res?.failed?.length) {
          this.message += ` | Failed: ${res.failed.length}`;
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.isSuccess = false;
        this.message = err?.error?.message || 'Upload failed';
        this.cdr.markForCheck();
      }
    });
  }

  // ================= MANUAL BULK SUBMIT =================
  submitBulk(): void {

    if (this.students.length === 0) {
      this.isSuccess = false;
      this.message = 'Please add at least one student';
      return;
    }

    this.loading = true;
    this.message = '';
    this.isSuccess = false;

    this.service.uploadManualStudents(this.students).subscribe({
      next: (res: any) => {
        this.loading = false;

        this.isSuccess = !!res?.success && !res?.failed?.length;
        this.message = res?.message || 'Bulk enrollment completed';

        if (res?.inserted?.length) {
          this.message += ` | Inserted: ${res.inserted.length}`;
        }

        if (res?.failed?.length) {
          this.message += ` | Failed: ${res.failed.length}`;
        }

        if (res?.success) {
          this.students = [];
          this.studentCount = 1;
        }

        this.cdr.markForCheck();
      },

      error: (err) => {
        this.loading = false;
        this.isSuccess = false;
        this.message = err?.error?.message || 'Bulk enrollment failed';
        this.cdr.markForCheck();
      }
    });
  }

  // ================= TRACK BY FUNCTIONS =================
  trackByIndex(index: number): number {
    return index;
  }

  trackByYearId(index: number, year: AcademicYear): number {
    return year.academicYearId;
  }

  trackByClassId(index: number, cls: Class): number {
    return cls.classId;
  }
}