import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { StudentStateService } from '../payments-services/student-state.service';
import {
  ViewStudentsService,
  StudentFilters,
} from '../../../features/dashboard/student-management/view-students';
import {
  SearchStateService,
} from '../../../core/services/search-state';
import { AcademicState } from '../../../shared/header/academic-state';
import { AcademicYear } from '../../../shared/header/services/academic-read';

interface Student {
  student_id: number | null;
  student_name: string;
  sur_name: string;
  dob: string | null;
  gender: string;
  section: string;
  email_id: string;

  parents_id: number | null;
  fathers_first_name: string;
  fathers_sur_name: string;
  mothers_first_name: string;
  mothers_sur_name: string;
  secondary_contact_number: string;
  email: string;
  address: string;
  occupation: string;
  contact_number: string;

  academic_year_id: number | null;

  class_id: number | null;
  class_name: string;
  fee_amount: number;

  payment_id: number | null;
  total_amount_paid: number;
  pending_amount: number;
  payment_status: string;
  due_date: string | null;

  tuition_transactions: any[];
}

@Component({
  selector: 'app-view-student',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './view-student.html',
  styleUrl: './view-student.css',
})
export class ViewStudent implements OnInit, OnDestroy {
  students: Student[] = [];
  originalStudents: Student[] = [];
  loading = false;
  error: string | null = null;
  currentAcademicYear: AcademicYear | null = null;
  selectedAcademicYearId = 1;
  filters: StudentFilters = {};

  // true once a fetch has completed successfully but returned zero students
  get hasNoData(): boolean {
    return !this.loading && !this.error && this.students.length === 0;
  }

  private destroy$ = new Subject<void>();

  // guards against re-fetching the same year twice (route change vs.
  // header dropdown change can both fire for the same year id)
  private lastFetchedYearId: number | null = null;

  constructor(
    private viewStudentsService: ViewStudentsService,
    private route: ActivatedRoute,
    private router: Router,
    private studentStateService: StudentStateService,
    private searchState: SearchStateService,
    private academicState: AcademicState,
    private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {

    // safety net: populate the shared academic years list if this page
    // is opened directly, bypassing Header
    if (!this.academicState.academicYearsSnapshot.length) {
      this.academicState
        .loadAcademicYears()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          error: (err) => console.error('Failed loading academic years:', err)
        });
    }

    // ================= REACT TO ACADEMIC YEAR CHANGES =================
    // Fires whenever the Header (or anything else) changes the shared
    // selected academic year. Keeps `currentAcademicYear` in sync AND
    // refetches the student list for the new year.
    this.academicState.selectedAcademicYear$
      .pipe(takeUntil(this.destroy$))
      .subscribe((year) => {
        this.currentAcademicYear = year;

        if (year && year.academicYearId !== this.lastFetchedYearId) {
          this.selectedAcademicYearId = year.academicYearId;
          this.loadStudents();
        }

        this.cdr.markForCheck();
      });

    // ================= ROUTE QUERY PARAMS =================
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const yearFromRoute = Number(params['academicYearId']) || 1;

      this.selectedAcademicYearId = yearFromRoute;
      this.filters = this.mapRouteFilters(params);

      this.loadAcademicYearContext();
      this.loadStudents();
    });

    // ================= SEARCH STATE =================
    this.searchState.search$.pipe(takeUntil(this.destroy$)).subscribe(search => {
      if (!Object.keys(search).length) return;

      this.selectedAcademicYearId = search.academicYearId
        ? Number(search.academicYearId)
        : this.selectedAcademicYearId;

      this.filters = {
        class_id: search.classId ? Number(search.classId) : undefined,
        section: search.section ? [search.section] : undefined,
        student_name: search.student_name || undefined,
        parent_name: search.parent_name || undefined,
      };

      this.loadAcademicYearContext();
      this.loadStudents();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // pulls the full academic-year payload (year + classes + books + uniforms)
  // so `currentAcademicYear` reflects whichever year the list is scoped to
  private loadAcademicYearContext(): void {
    if (!this.selectedAcademicYearId) return;

    this.academicState
      .loadAcademicYearFull(this.selectedAcademicYearId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        error: (err) => console.error('Failed loading academic year data:', err)
      });
  }

  private mapRouteFilters(params: any): StudentFilters {
    const parseArray = (value: any) =>
      value ? (Array.isArray(value) ? value : [value]) : undefined;

    return {
      class_id: params['classId'] ? Number(params['classId']) : undefined,
      section: parseArray(params['section']),
      status: parseArray(params['status']),
      payment_status: parseArray(params['payment_status']),
      student_name: params['student_name'] || undefined,
      parent_name: params['parent_name'] || undefined,
    };
  }

  loadStudents(): void {
    if (!this.selectedAcademicYearId) return;

    this.loading = true;
    this.error = null;
    this.lastFetchedYearId = this.selectedAcademicYearId;

    this.viewStudentsService
      .getStudentsByAcademicYear(this.selectedAcademicYearId, this.filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => {
          const studentsData = response?.data?.students ?? [];

          if (!Array.isArray(studentsData) || studentsData.length === 0) {
            this.students = [];
            this.originalStudents = [];
            this.loading = false;
            this.cdr.markForCheck();
            return;
          }

          const mapped: Student[] = studentsData.map((item: any) => {
            const student = item.student ?? {};
            const parent = item.parent ?? {};
            const payment = item.payment ?? {};
            const classData = item.class ?? {};
            const transactions = Array.isArray(payment.tuition_transactions)
              ? payment.tuition_transactions
              : [];

            return {
              student_id: student.student_id ?? null,
              student_name: student.student_name ?? '',
              sur_name: student.sur_name ?? '',
              dob: student.dob ?? null,
              gender: student.gender ?? '',
              section: student.section ?? '',
              email_id: student.email_id ?? '',

              parents_id: parent.parents_id ?? null,
              fathers_first_name: parent.fathers_first_name ?? '',
              fathers_sur_name: parent.fathers_sur_name ?? '',
              mothers_first_name: parent.mothers_first_name ?? '',
              mothers_sur_name: parent.mothers_sur_name ?? '',
              secondary_contact_number: parent.secondary_contact_number ?? '',
              email: parent.email ?? '',
              address: parent.address ?? '',
              occupation: parent.occupation ?? '',
              contact_number: parent.contact_number ?? '',

              academic_year_id: item.academic_year_id ?? null,

              class_id: classData.class_id ?? null,
              class_name: classData.class_name ?? '',
              fee_amount: classData.fee_amount ?? 0,

              payment_id: payment.payment_id ?? null,
              total_amount_paid: payment.total_amount_paid ?? 0,
              pending_amount: payment.pending_amount ?? 0,
              payment_status: payment.payment_status ?? '',
              due_date: payment.due_date ?? null,

              tuition_transactions: transactions,
            };
          });

          this.students = mapped;
          this.originalStudents = [...mapped];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: err => {
          console.error('Failed to load students:', err);
          this.error = 'Failed to fetch students';
          this.students = [];
          this.originalStudents = [];
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  filterSiblings(parentsId: number): void {
    if (!parentsId) return;

    this.students = this.originalStudents.filter(
      s => Number(s.parents_id) === Number(parentsId)
    );
  }

  resetFilters(): void {
    this.filters = {};
    this.students = [...this.originalStudents];
    this.searchState.clearSearch();
  }

  onUpdateStudent(student: Student): void {
    this.studentStateService.setSelectedStudent(student);

    this.router.navigate(['/update-student'], {
      state: { student },
    });
  }

  onViewFamilyPending(student: Student): void {
    this.studentStateService.setSelectedStudent(student);

    this.router.navigate(['/student-model'], {
      queryParams: {
        studentId: student.student_id,
      },
    });
  }

  goToPayments(student: Student): void {
    this.studentStateService.setSelectedStudent(student);

    this.router.navigate(['/payments'], {
      queryParams: {
        studentId: student.student_id,
        classId: student.class_id,
        academicYearId: student.academic_year_id,
      },
    });
  }
}