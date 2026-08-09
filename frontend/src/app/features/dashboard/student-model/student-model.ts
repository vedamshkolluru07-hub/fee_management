import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  effect,
  DestroyRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, map, of, catchError } from 'rxjs';

import {
  FamilyPendingService,
  FamilyPendingRow
} from '../payments-services/family-pending';

import { StudentStateService } from '../payments-services/student-state.service';

import {
  AcademicReadService,
  AcademicFullResponse
} from '../../../shared/header/services/academic-read';

// =========================
// LOCAL UI TYPES
// =========================
type Student = {
  student_id: number;

  student_name?: string;
  sur_name?: string;
  dob?: string;
  gender?: string;
  section?: string;
  email_id?: string;
  status?: string;

  parents_id?: number;
  fathers_first_name?: string;
  fathers_sur_name?: string;
  mothers_first_name?: string;
  mothers_sur_name?: string;
  contact_number?: string;
  secondary_contact_number?: string;
  occupation?: string;
  address?: string;
};

// One student (sibling) inside the family, with all of their
// year-wise payment rows grouped together and a total just for them.
export type StudentGroup = {
  studentId: number;
  studentName: string;
  section?: string;
  status?: string;
  rows: FamilyPendingRow[];      // year-wise pending rows for THIS student only
  studentTotal: number;          // pending + books + uniform, summed across this student's rows
};

@Component({
  selector: 'app-student-model',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './student-model.html',
  styleUrls: ['./student-model.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StudentModel {

  // =========================
  // INJECT
  // =========================
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly familyPendingService = inject(FamilyPendingService);
  private readonly studentStateService = inject(StudentStateService);
  private readonly academicService = inject(AcademicReadService);
  private readonly destroyRef = inject(DestroyRef);

  // =========================
  // STATE
  // =========================
  readonly student = signal<Student | null>(null);
  readonly familyPendingRows = signal<FamilyPendingRow[]>([]);
  readonly isLoadingDues = signal(false);
  readonly duesErrorMessage = signal<string | null>(null);

  private lastLoadedStudentId: number | null = null;

  // =========================
  // ACADEMIC YEAR / CLASS LOOKUPS
  // =========================
  // Rows only carry academic_year_id / class_id from the payments side.
  // We resolve those to their human-readable yearLabel / className by
  // calling AcademicReadService.getAcademicYearFull() for every
  // DISTINCT academic_year_id present in familyPendingRows (siblings
  // can span different years), then build lookup maps from the
  // results. We deliberately do NOT go through AcademicState for this
  // — AcademicState holds the header's single "currently selected"
  // academic year, and pulling multiple years' data through it here
  // would stomp on that shared state as a side effect.
  readonly yearLabels = signal<Map<number, string>>(new Map());
  readonly classNames = signal<Map<number, string>>(new Map());

  private lastLoadedAcademicYearIds = '';

  // =========================
  // UI STATE
  // =========================
  // NOTE: dropdown open-state is now keyed by `${studentId}-${paymentId}`
  // instead of just paymentId. This avoids two different students'
  // payment_id values colliding in the same Set (payment_id is unique
  // per row already, but keeping the student in the key makes the
  // toggle state explicitly scoped per student per row, which is
  // clearer given the page now renders one table PER student).
  readonly openBooks = signal<Set<string>>(new Set());
  readonly openUniform = signal<Set<string>>(new Set());
  readonly openTxn = signal<Set<string>>(new Set());

  // =========================
  // REACTIVE QUERY PARAM
  // =========================
  // toSignal() converts the route's queryParamMap OBSERVABLE into a
  // signal, so effect() has a real dependency to track and re-runs
  // correctly every time the studentId query param changes.
  private readonly studentIdParam = toSignal(
    this.route.queryParamMap.pipe(map(params => params.get('studentId'))),
    { initialValue: this.route.snapshot.queryParamMap.get('studentId') }
  );

  // =========================
  // READ QUERY PARAM + LOAD
  // =========================
  private readonly autoLoadEffect = effect(() => {
    const studentIdParam = this.studentIdParam();

    if (!studentIdParam) return;

    const studentId = Number(studentIdParam);
    if (isNaN(studentId)) return;

    if (this.lastLoadedStudentId === studentId) return;

    this.lastLoadedStudentId = studentId;
    this.loadFamilyPending(studentId);
  });

  // =========================
  // API CALL
  // =========================
  private loadFamilyPending(studentId: number): void {
    this.isLoadingDues.set(true);
    this.duesErrorMessage.set(null);

    this.familyPendingService
      .getFamilyPending(studentId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          const rows = response?.data ?? [];
          this.familyPendingRows.set(rows);

          // Set the CURRENT student's context using the row that
          // actually matches the requested studentId — not just the
          // first row in the response, since the first row could
          // belong to a sibling depending on the ORDER BY in the
          // backend query (it sorts by student_name, not by the
          // requested studentId).
          const matched =
            rows.find(r => r.student_id === studentId) ??
            rows[0];

          if (matched) {
            this.student.set({
              student_id: matched.student_id,
              student_name: matched.student_name ?? undefined,
              sur_name: matched.sur_name ?? undefined,
              dob: matched.dob ?? undefined,
              gender: matched.gender ?? undefined,
              section: matched.section ?? undefined,
              email_id: matched.email_id ?? undefined,
              status: matched.status ?? undefined,
              parents_id: matched.parents_id ?? undefined,
              fathers_first_name: matched.fathers_first_name ?? undefined,
              fathers_sur_name: matched.fathers_sur_name ?? undefined,
              mothers_first_name: matched.mothers_first_name ?? undefined,
              mothers_sur_name: matched.mothers_sur_name ?? undefined,
              contact_number: matched.contact_number ?? undefined,
              secondary_contact_number: matched.secondary_contact_number ?? undefined,
              occupation: matched.occupation ?? undefined,
              address: matched.address ?? undefined
            });
          } else {
            this.student.set(null);
          }

          this.isLoadingDues.set(false);

          // Resolve year labels / class names for whatever academic
          // years showed up in this response.
          this.loadAcademicLabels(rows);
        },
        error: (err: unknown) => {
          console.error('Family pending error:', err);

          this.duesErrorMessage.set(
            err instanceof Error
              ? err.message
              : 'Failed to load family pending data'
          );

          this.isLoadingDues.set(false);
        }
      });
  }

  // =========================
  // ACADEMIC LABEL RESOLUTION
  // =========================
  // Fetches the full academic-year payload (year + its classes) for
  // every distinct academic_year_id in the given rows, then builds
  // yearLabels (academicYearId -> yearLabel) and classNames
  // (classId -> className) maps used by the template.
  private loadAcademicLabels(rows: FamilyPendingRow[]): void {
    const distinctYearIds = Array.from(
      new Set(
        rows
          .map(r => r.academic_year_id)
          .filter((id): id is number => id != null)
      )
    );

    if (distinctYearIds.length === 0) {
      return;
    }

    // Skip refetching if we've already resolved exactly this set of
    // years (e.g. re-render triggered by an unrelated signal change).
    const key = distinctYearIds.slice().sort((a, b) => a - b).join(',');
    if (key === this.lastLoadedAcademicYearIds) {
      return;
    }
    this.lastLoadedAcademicYearIds = key;

    forkJoin(
      distinctYearIds.map(id =>
        this.academicService.getAcademicYearFull(id).pipe(
          catchError(() => of(null))
        )
      )
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((responses) => {
        const nextYearLabels = new Map<number, string>();
        const nextClassNames = new Map<number, string>();

        responses.forEach((res) => {
          const data: AcademicFullResponse | undefined = res?.success
            ? res.data
            : undefined;

          if (!data) return;

          if (data.academicYear) {
            nextYearLabels.set(
              data.academicYear.academicYearId,
              data.academicYear.yearLabel
            );
          }

          for (const cls of data.classes ?? []) {
            nextClassNames.set(cls.classId, cls.className);
          }
        });

        this.yearLabels.set(nextYearLabels);
        this.classNames.set(nextClassNames);
      });
  }

  // Template helpers — fall back to the raw id if the lookup hasn't
  // resolved yet (e.g. still loading) or the year/class was removed.
  yearLabelFor(row: FamilyPendingRow): string {
    return this.yearLabels().get(row.academic_year_id) ?? String(row.academic_year_id);
  }

  classNameFor(row: FamilyPendingRow): string {
    return this.classNames().get(row.class_id) ?? String(row.class_id);
  }

  // =========================
  // MANUAL RELOAD
  // =========================
  loadAllStudentDues(): void {
    const studentId = this.studentIdParam();
    if (!studentId) return;

    this.lastLoadedStudentId = null;
    this.loadFamilyPending(Number(studentId));
  }

  // =========================
  // TOGGLES
  // (key is "studentId-paymentId" so state never leaks across students)
  // =========================
  toggleBooks(studentId: number, paymentId: number): void {
    const key = `${studentId}-${paymentId}`;
    const set = new Set(this.openBooks());
    set.has(key) ? set.delete(key) : set.add(key);
    this.openBooks.set(set);
  }

  toggleUniform(studentId: number, paymentId: number): void {
    const key = `${studentId}-${paymentId}`;
    const set = new Set(this.openUniform());
    set.has(key) ? set.delete(key) : set.add(key);
    this.openUniform.set(set);
  }

  toggleTxn(studentId: number, paymentId: number): void {
    const key = `${studentId}-${paymentId}`;
    const set = new Set(this.openTxn());
    set.has(key) ? set.delete(key) : set.add(key);
    this.openTxn.set(set);
  }

  // =========================
  // CHECKERS
  // =========================
  isBooksOpen = (studentId: number, paymentId: number) =>
    this.openBooks().has(`${studentId}-${paymentId}`);

  isUniformOpen = (studentId: number, paymentId: number) =>
    this.openUniform().has(`${studentId}-${paymentId}`);

  isTxnOpen = (studentId: number, paymentId: number) =>
    this.openTxn().has(`${studentId}-${paymentId}`);

  // =========================
  // COMPUTED: PER-STUDENT GROUPS
  // =========================
  readonly studentGroups = computed<StudentGroup[]>(() => {
    const rows = this.familyPendingRows();
    const order: number[] = [];
    const map = new Map<number, FamilyPendingRow[]>();

    for (const row of rows) {
      if (!map.has(row.student_id)) {
        map.set(row.student_id, []);
        order.push(row.student_id);
      }
      map.get(row.student_id)!.push(row);
    }

    return order.map((studentId) => {
      const studentRows = map.get(studentId)!;
      const first = studentRows[0];

      const studentTotal = studentRows.reduce(
        (sum, r) =>
          sum +
          (r.total_amount_pending ?? 0) +
          (r.books_pending ?? 0) +
          (r.uniform_pending ?? 0),
        0
      );

      return {
        studentId,
        studentName: first.student_name,
        section: first.section,
        status: first.status,
        rows: studentRows,
        studentTotal
      };
    });
  });

  // =========================
  // COMPUTED: CURRENT STUDENT ONLY
  // =========================
  readonly studentTotalPending = computed(() => {
    const currentId = this.student()?.student_id;
    if (currentId == null) return 0;

    return this.familyPendingRows()
      .filter(r => r.student_id === currentId)
      .reduce(
        (sum, r) =>
          sum +
          (r.total_amount_pending ?? 0) +
          (r.books_pending ?? 0) +
          (r.uniform_pending ?? 0),
        0
      );
  });

  readonly currentStudentRows = computed(() => {
    const currentId = this.student()?.student_id;
    if (currentId == null) return [];

    return this.familyPendingRows().filter(r => r.student_id === currentId);
  });

  // =========================
  // COMPUTED: FAMILY-WIDE TOTAL
  // =========================
  readonly familyGrandTotal = computed(() =>
    this.studentGroups().reduce((sum, g) => sum + g.studentTotal, 0)
  );

  readonly familyTotalPending = computed(() => this.familyGrandTotal());

  // =========================
  // NAVIGATION: PAY FOR A SPECIFIC YEAR/CLASS ROW
  // =========================
  // Sends the user to the Transactions component scoped to THIS row's
  // academic year + class (not whatever happens to be "current" in
  // header/state). Transactions reads studentId/classId/academicYearId
  // from query params and reloads its own academic-year/class context
  // and payment id from those (see Transactions.ngOnInit ->
  // loadAcademicContext / loadPaymentId), so passing the row's own ids
  // here is enough for it to render the correct year/class.
  //
  // ASSUMPTION: Transactions is mounted at '/payments/transactions',
  // matching the sibling routes already used elsewhere in this file
  // ('/payments/view-tution', '/payments/view-books',
  // '/payments/view-unifrom'). Update this path if your actual route
  // differs.
  goToTransactions(row: FamilyPendingRow): void {
    const s = this.student();

    // Transactions rebuilds `student` from StudentStateService on
    // init, so keep that in sync with the row being paid — the row's
    // own class/year ids (which may differ from the student's
    // "current" class/year) are what actually drive which payment
    // gets loaded there.
    if (s) {
      this.studentStateService.setSelectedStudent({
        ...s,
        class_id: row.class_id,
        academic_year_id: row.academic_year_id
      });
    }

    this.router.navigate(['/payments'], {
      queryParams: {
        studentId: row.student_id,
        classId: row.class_id,
        academicYearId: row.academic_year_id,
        paymentId: row.payment_id
      }
    });
  }

  // =========================
  // EVENTS
  // =========================
  onUpdateClick(): void {
    console.log('Update student:', this.student());
  }

  closeModal(): void {
    console.log('Close modal');
  }
}