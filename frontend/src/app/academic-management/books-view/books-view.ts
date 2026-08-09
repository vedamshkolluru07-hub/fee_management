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
  AcademicReadService,
  Book,
  Class,
  AcademicYear
} from '../../shared/header/services/academic-read';

import { AcademicUpdateService } from '../../shared/header/services/academic-update';
import { CascadeDeleteService } from '../../shared/header/services/cascade-delete';
import { AcademicState } from '../../shared/header/academic-state';

// ================= INTERFACE =================
interface BookRow extends Book {
  editing: boolean;
  draft: Partial<Book>;
  selected: boolean;
}

interface ClassWithBooks extends Class {
  books: BookRow[];
}

@Component({
  selector: 'app-books-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './books-view.html',
  styleUrl: './books-view.css',
})
export class BooksView implements OnInit, OnDestroy {

  // ================= DEPENDENCIES =================
  private readService = inject(AcademicReadService);
  private readonly cdr = inject(ChangeDetectorRef);
  private updateService = inject(AcademicUpdateService);
  private deleteService = inject(CascadeDeleteService);
  private state = inject(AcademicState);
  private router = inject(Router);

  private sub = new Subscription();

  // ================= STATE =================
  selectedYear: AcademicYear | null = null;

  classes: ClassWithBooks[] = [];

  loading = false;
  saving = false;

  successMessage = '';
  errorMessage = '';

  private initialized = false;

  // ================= GETTERS =================
  get allSelected(): boolean {
    const allBooks = this.classes.flatMap(c => c.books);
    return allBooks.length > 0 && allBooks.every(r => r.selected);
  }

  get anySelected(): boolean {
    return this.classes.some(c => c.books.some(b => b.selected));
  }

  get anyEditing(): boolean {
    return this.classes.some(c => c.books.some(b => b.editing));
  }

  // ================= INIT =================
  ngOnInit(): void {

    this.sub.add(
      this.state.selectedAcademicYear$.subscribe(y => {
        this.selectedYear = y;
      })
    );

    this.sub.add(
      this.state.classes$.subscribe(c => {

        if (!c?.length) return;

        this.classes = c.map(cls => ({
          ...cls,
          books: []
        }));

        if (!this.initialized) {
          this.initialized = true;
          this.loadAllBooks();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // ================= LOAD BOOKS =================
  loadAllBooks(): void {
    this.loading = true;
    this.errorMessage = '';

    const yearId = this.selectedYear?.academicYearId;

    if (!yearId) {
      this.loading = false;
      this.errorMessage = 'Academic Year not found.';
      return;
    }

    this.readService.getBooksByAcademicYearId(yearId).subscribe({
      next: (res) => {

        const allBooks: Book[] = res?.data || [];

        this.classes = this.classes.map(cls => ({
          ...cls,
          books: allBooks
            .filter(b => b.classId === cls.classId)
            .map(b => ({
              ...b,
              editing: false,
              draft: {},
              selected: false
            }))
        }));

        this.loading = false;
this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load books.';
        this.clearMessages();
        this.cdr.markForCheck();
      }
    });
  }

  // ================= EDIT =================
  startEdit(row: BookRow): void {
    row.editing = true;
    row.draft = {
      bookType: row.bookType,
      bookAmount: row.bookAmount,
      isConnected: row.isConnected
    };
  }

  cancelEdit(row: BookRow): void {
    row.editing = false;
    row.draft = {};
  }

  saveRow(row: BookRow): void {
    this.saving = true;

    this.updateService.updateBooks({
      id: row.bookId,
      data: row.draft
    }).subscribe({
      next: () => {
        Object.assign(row, row.draft);
        row.editing = false;
        row.draft = {};

        this.saving = false;
        this.successMessage = 'Updated successfully.';
        this.clearMessages();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Update failed.';
        this.clearMessages();
        this.cdr.markForCheck();
      }
    });
  }

  // ================= BULK UPDATE =================
  bulkSave(): void {
    const editingRows = this.classes
      .flatMap(c => c.books)
      .filter(r => r.editing);

    if (!editingRows.length) return;

    this.saving = true;

    this.updateService.updateBooks({
      id: editingRows.map(r => r.bookId),
      data: editingRows.map(r => r.draft)
    }).subscribe({
      next: () => {
        editingRows.forEach(r => {
          Object.assign(r, r.draft);
          r.editing = false;
          r.draft = {};
        });

        this.saving = false;
        this.successMessage = 'Bulk update successful.';
        this.clearMessages();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Bulk update failed.';
        this.clearMessages();
        this.cdr.markForCheck();
      }
    });
  }

  // ================= SELECT =================
  toggleAllForClass(event: Event, cls: ClassWithBooks): void {
    const checked = (event.target as HTMLInputElement).checked;
    cls.books.forEach(b => b.selected = checked);
  }

  // ================= DELETE =================
  deleteRow(row: BookRow): void {
    if (!confirm(`Delete book "${row.bookType}"?`)) return;

    this.deleteService.cascadeDelete({
      bookIds: [row.bookId]
    }).subscribe({
      next: () => {
        this.classes.forEach(c => {
          c.books = c.books.filter(b => b.bookId !== row.bookId);
        });

        this.successMessage = 'Deleted successfully.';
        this.clearMessages();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Delete failed.';
        this.clearMessages();
        this.cdr.markForCheck();
      }
    });
  }

  bulkDelete(): void {
    const selected = this.classes
      .flatMap(c => c.books)
      .filter(b => b.selected);

    if (!selected.length) return;

    if (!confirm(`Delete ${selected.length} book(s)?`)) return;

    this.deleteService.cascadeDelete({
      bookIds: selected.map(b => b.bookId)
    }).subscribe({
      next: () => {
        this.classes.forEach(c => {
          c.books = c.books.filter(b => !b.selected);
        });

        this.successMessage = 'Bulk delete successful.';
        this.clearMessages();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Bulk delete failed.';
        this.clearMessages();
        this.cdr.markForCheck();
      }
    });
  }

  // ================= NAV =================
  goToCreate(): void {
    this.router.navigate(['/books-create']);
  }

  goToUniform(): void{
    this.router.navigate(['/uniform-view']);
  }

  // ================= UTILITY =================
  private clearMessages(): void {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 3000);
  }
}