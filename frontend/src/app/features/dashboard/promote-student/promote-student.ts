import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Subject, takeUntil } from 'rxjs';

import {
  AcademicReadService,
  AcademicYear,
  Class,
} from '../../../shared/header/services/academic-read';

import {
  PromoteStudentsService,
  PromoteStudentsRequest,
  PromoteStudentResult,
} from '../payments-services/promote-students';

import { ViewStudentsService } from '../../../features/dashboard/student-management/view-students';

// =========================
// LOCAL UI MODEL
// =========================
interface StudentPromotionRow {
  studentId: number;
  name: string;
  currentClass: string;
  status: 'active' | 'failed' | 'inactive';
  doublePromotion: boolean;
  doublePromotionTarget: string;
}

@Component({
  selector: 'app-promote-student',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './promote-student.html',
  styleUrls: ['./promote-student.css'],
})
export class PromoteStudent implements OnInit, OnDestroy {

  // =========================
  // DESTROY
  // =========================
  private destroy$ = new Subject<void>();

  // =========================
  // MODAL STATE
  // =========================
  selectedOperation: string = 'promote';

  // =========================
  // DATA
  // =========================
  // This component owns its own data end-to-end and never reads
  // from or writes to the shared AcademicState singleton, since
  // promotion spans two academic years (prev/next) and must not be
  // coupled to whatever year the rest of the app has "selected".
  academicYears: AcademicYear[] = [];
  filteredClasses: Class[] = [];
  students: StudentPromotionRow[] = [];
  promotionResults: PromoteStudentResult[] = [];

  // =========================
  // FORM
  // =========================
  promotionFromYearId: number | null = null;
  promotionSelectedClassId: number | null = null;

  // =========================
  // UI STATE
  // =========================
  loading = false;
  promoting = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private academicReadService: AcademicReadService,
    private promoteStudentsService: PromoteStudentsService,
    private viewStudentsService: ViewStudentsService,
    // Zoneless app (Angular 21, no zone.js) — markForCheck() needed
    // after every subscribe callback to trigger repaint.
    private cdr: ChangeDetectorRef
  ) {}

  // =========================
  // INIT
  // =========================
  ngOnInit(): void {
    this.loadInitialAcademicData();
  }

  // =========================
  // LOAD ALL ACADEMIC YEARS
  // =========================
  private loadInitialAcademicData(): void {

    this.loading = true;
    this.errorMessage = '';

    this.academicReadService
      .getAllAcademicYears()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading = false;

          this.academicYears = res?.data ?? [];
          this.sortAcademicYears();

          if (!this.academicYears.length) {
            this.errorMessage = 'No academic years found';
          }

          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Failed to load academic years';
          this.cdr.markForCheck();
        },
      });
  }

  // =========================
  // SORT YEARS
  // =========================
  private sortAcademicYears(): void {
    this.academicYears.sort(
      (a, b) => a.academicYearId - b.academicYearId
    );
  }

  // =========================
  // YEAR CHANGE -> LOAD FULL YEAR DATA FOR CLASSES
  // =========================
  onAcademicYearChange(): void {

    this.promotionSelectedClassId = null;
    this.filteredClasses = [];
    this.students = [];
    this.promotionResults = [];

    if (!this.promotionFromYearId) return;

    this.loading = true;

    this.academicReadService
      .getAcademicYearFull(this.promotionFromYearId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading = false;
          this.filteredClasses = res?.data?.classes || [];
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Failed to load classes';
          this.cdr.markForCheck();
        },
      });
  }

  // =========================
  // CLASS CHANGE -> FETCH STUDENTS FOR REVIEW
  // =========================
  onClassChange(): void {

    this.students = [];
    this.promotionResults = [];
    this.resetMessages();

    if (!this.promotionFromYearId || !this.promotionSelectedClassId) return;

    this.loading = true;

    this.viewStudentsService
      .getStudentsByAcademicYear(
        this.promotionFromYearId,
        { class_id: this.promotionSelectedClassId }
      )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (studentsRes) => {
          this.loading = false;

          const rawStudents = studentsRes?.data?.students || [];

          this.students = rawStudents
            .filter((s: any) => s?.student?.student_id)
            .map((s: any): StudentPromotionRow => ({
              studentId: Number(s.student.student_id),
              name: s.student.name || s.student.student_name || 'Unknown',
              currentClass: s.student.class_name || '',
              status: 'active',
              doublePromotion: false,
              doublePromotionTarget: '',
            }));

          if (!this.students.length) {
            this.errorMessage = 'No students found';
          }

          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.errorMessage = 'Failed to fetch students';
          this.cdr.markForCheck();
        },
      });
  }

  // =========================
  // PER-ROW TOGGLES (called from template)
  // =========================
  setStudentStatus(row: StudentPromotionRow, status: StudentPromotionRow['status']): void {
    row.status = status;
    if (status !== 'active') {
      row.doublePromotion = false;
      row.doublePromotionTarget = '';
    }
  }

  toggleDoublePromotion(row: StudentPromotionRow): void {
    row.doublePromotion = !row.doublePromotion;
    if (!row.doublePromotion) {
      row.doublePromotionTarget = '';
    }
  }

  // =========================
  // PROMOTE STUDENTS
  // =========================
  handlePromotion(): void {

    this.resetMessages();

    if (!this.promotionFromYearId) {
      this.errorMessage = 'Please select academic year';
      return;
    }

    if (!this.promotionSelectedClassId) {
      this.errorMessage = 'Please select class';
      return;
    }

    if (!this.students.length) {
      this.errorMessage = 'No students to promote';
      return;
    }

    const currentIndex = this.academicYears.findIndex(
      y => Number(y.academicYearId) === Number(this.promotionFromYearId)
    );

    const nextYear = this.academicYears[currentIndex + 1];

    if (!nextYear) {
      this.errorMessage = 'Next academic year not found';
      return;
    }

    const studentIds: number[] = [];
    const studentStatusMap: Record<string, string> = {};
    const doublePromotions: Record<string, string | boolean> = {};

    for (const row of this.students) {
      studentIds.push(row.studentId);

      if (row.status !== 'active') {
        studentStatusMap[String(row.studentId)] = row.status;
      }

      if (row.status === 'active' && row.doublePromotion) {
        doublePromotions[String(row.studentId)] =
          row.doublePromotionTarget?.trim() || true;
      }
    }

    const payload: PromoteStudentsRequest = {
      prevYearId: Number(this.promotionFromYearId),
      nextYearId: Number(nextYear.academicYearId),
      studentIds,
      studentStatusMap,
      doublePromotions,
    };

    this.promoting = true;

    this.promoteStudentsService
      .promoteStudents(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.promoting = false;

          if (!res.success) {
            this.errorMessage = res.message || 'Promotion failed';
            this.cdr.markForCheck();
            return;
          }

          this.promotionResults = res.data || [];
          this.successMessage = res.message || 'Students promoted successfully';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.promoting = false;
          this.errorMessage = err?.error?.message || 'Promotion failed';
          this.cdr.markForCheck();
        },
      });
  }

  // =========================
  // RESET MESSAGES
  // =========================
  private resetMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // =========================
  // CLOSE MODAL
  // =========================
  closePromotionModal(): void {

    this.selectedOperation = '';
    this.promotionFromYearId = null;
    this.promotionSelectedClassId = null;

    this.students = [];
    this.filteredClasses = [];
    this.promotionResults = [];

    this.loading = false;
    this.promoting = false;

    this.resetMessages();
  }

  // =========================
  // DESTROY
  // =========================
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}