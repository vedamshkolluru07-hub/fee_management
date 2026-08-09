import { Injectable, inject } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

import {
  AcademicReadService,
  AcademicYear,
  Class,
  Book,
  Uniform,
} from '../header/services/academic-read';

@Injectable({
  providedIn: 'root',
})
export class AcademicState {

  private academicReadService = inject(AcademicReadService);

  // =========================
  // STATE SUBJECTS
  // =========================

  private academicYearsSubject =
    new BehaviorSubject<AcademicYear[]>([]);

  private selectedAcademicYearSubject =
    new BehaviorSubject<AcademicYear | null>(null);

  private classesSubject =
    new BehaviorSubject<Class[]>([]);

  private booksSubject =
    new BehaviorSubject<Book[]>([]);

  private uniformsSubject =
    new BehaviorSubject<Uniform[]>([]);

  // =========================
  // OBSERVABLES (READ)
  // =========================

  academicYears$ =
    this.academicYearsSubject.asObservable();

  selectedAcademicYear$ =
    this.selectedAcademicYearSubject.asObservable();

  classes$ =
    this.classesSubject.asObservable();

  books$ =
    this.booksSubject.asObservable();

  uniforms$ =
    this.uniformsSubject.asObservable();

  // =========================
  // SNAPSHOT GETTERS (non-reactive, used for "already loaded?" checks)
  // =========================

  get academicYearsSnapshot(): AcademicYear[] {
    return this.academicYearsSubject.getValue();
  }

  get selectedAcademicYearSnapshot(): AcademicYear | null {
    return this.selectedAcademicYearSubject.getValue();
  }

  // =========================
  // FETCH + SET (API CALLS)
  // =========================

  /** Loads the full list of academic years into state. */
  loadAcademicYears() {
    return this.academicReadService.getAllAcademicYears().pipe(
      tap((res) => {
        if (res.success) {
          this.setAcademicYears(res.data ?? []);
        }
      })
    );
  }

  /**
   * Loads the FULL payload for one academic year (year + classes + books +
   * uniforms) in a single request and pushes all four pieces of state at once.
   */
  loadAcademicYearFull(academicYearId: number) {
    return this.academicReadService.getAcademicYearFull(academicYearId).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.setSelectedAcademicYear(res.data.academicYear ?? null);
          this.setClasses(res.data.classes ?? []);
          this.setBooks(res.data.books ?? []);
          this.setUniforms(res.data.uniforms ?? []);
        }
      })
    );
  }

  // =========================
  // SETTERS (WRITE STATE)
  // =========================

  setAcademicYears(data: AcademicYear[]) {
    this.academicYearsSubject.next(data);
  }

  setSelectedAcademicYear(data: AcademicYear | null) {
    this.selectedAcademicYearSubject.next(data);
  }

  setClasses(data: Class[]) {
    this.classesSubject.next(data);
  }

  setBooks(data: Book[]) {
    this.booksSubject.next(data);
  }

  setUniforms(data: Uniform[]) {
    this.uniformsSubject.next(data);
  }

  // =========================
  // CLEAR STATE
  // =========================

  clearAll() {
    this.academicYearsSubject.next([]);
    this.selectedAcademicYearSubject.next(null);
    this.classesSubject.next([]);
    this.booksSubject.next([]);
    this.uniformsSubject.next([]);
  }
}