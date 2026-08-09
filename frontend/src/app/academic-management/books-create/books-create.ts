import {
  Component,
  inject,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import {
  AcademicSetupService,
  BookPayload
} from '../../shared/header/services/academic-setup';

import { AcademicState } from '../../shared/header/academic-state';
import { AcademicYear, Class } from '../../shared/header/services/academic-read';

// ================= INTERFACE =================
interface BookDraft {
  bookType: string;
  bookAmount: number | null;
}

@Component({
  selector: 'app-books-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './books-create.html',
  styleUrl: './books-create.css',
})
export class BooksCreate implements OnInit, OnDestroy {

  // ================= DEPENDENCIES =================
  private setupService = inject(AcademicSetupService);
  private readonly cdr = inject(ChangeDetectorRef);
  private state = inject(AcademicState);
  private router = inject(Router);

  private sub = new Subscription();

  // ================= STATE =================
  selectedYear: AcademicYear | null = null;

  classes: Class[] = [];                // from API/state
  incomingClasses: any[] = [];          // from previous screen

  selectedClassId: number | null = null;

  drafts: BookDraft[] = [this.emptyDraft()];

  saving = false;
  successMessage = '';
  errorMessage = '';

  // ================= INIT =================
  ngOnInit(): void {

    // Get Academic Year
    this.sub.add(
      this.state.selectedAcademicYear$.subscribe(y => {
        this.selectedYear = y;
      })
    );

    // Get Classes from state (fallback)
    this.sub.add(
      this.state.classes$.subscribe(c => {
        this.classes = c;
      })
    );

    // Get classes passed from previous component
    const nav = this.router.getCurrentNavigation();
    const stateData = nav?.extras?.state as { classes?: any[] };

    if (stateData?.classes && stateData.classes.length) {
      this.incomingClasses = stateData.classes;

      // Optional: auto-select first class if only one
      if (this.incomingClasses.length === 1) {
        this.selectedClassId = this.incomingClasses[0]?.classId || null;
      }
    }
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // ================= HELPERS =================
  emptyDraft(): BookDraft {
    return { bookType: '', bookAmount: null };
  }

  addRow(): void {
    this.drafts.push(this.emptyDraft());
  }

  removeRow(index: number): void {
    if (this.drafts.length > 1) {
      this.drafts.splice(index, 1);
    }
  }

  private toNumber(value: any): number {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  // ================= VALIDATION =================
  isValid(): boolean {
    return !!this.selectedClassId &&
      this.drafts.every(d => d.bookType?.trim().length > 0);
  }

  // ================= SAVE =================
  saveAll(): void {

    if (!this.isValid() || !this.selectedClassId) {
      this.errorMessage = 'Select a class and fill all book types.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const books: BookPayload[] = this.drafts.map(d => ({
      bookType: d.bookType.trim(),
      bookAmount: this.toNumber(d.bookAmount)
    }));

    this.setupService
      .createBooksForClass(this.selectedClassId, books)
      .subscribe({
        next: () => {
          this.saving = false;
          this.successMessage = 'Books created successfully!';
          this.drafts = [this.emptyDraft()];
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage =
            err?.error?.message || 'Failed to create books.';
          this.cdr.markForCheck();
        }
      });
  }

  // ================= NAV =================
  goToView(): void {
    this.router.navigate(['/academic-management/books']);
  }
}