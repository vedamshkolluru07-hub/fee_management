// src/app/core/services/search-state.service.ts

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

// =======================
// SEARCH FILTER TYPE
// =======================
export interface SearchFilters {
  academicYearId?: number;
  classId?: number;
  section?: string;
  student_name?: string;
  parent_name?: string;
  student_id?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SearchStateService {

  // =======================
  // INTERNAL STATE STORE
  // =======================
  private searchSubject = new BehaviorSubject<SearchFilters>({});

  // Observable for components to subscribe
  search$ = this.searchSubject.asObservable();

  // =======================
  // UPDATE SEARCH FILTERS
  // =======================
  updateSearch(filters: SearchFilters): void {
    this.searchSubject.next(filters);
  }

  // =======================
  // GET CURRENT VALUE
  // =======================
  getCurrentSearch(): SearchFilters {
    return this.searchSubject.getValue();
  }

  // =======================
  // RESET SEARCH
  // =======================
  clearSearch(): void {
    this.searchSubject.next({});
  }
}