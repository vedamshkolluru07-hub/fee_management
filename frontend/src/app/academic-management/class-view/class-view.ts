import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AcademicReadService, Class, AcademicYear } from '../../shared/header/services/academic-read';
import { AcademicUpdateService } from '../../shared/header/services/academic-update';
import { CascadeDeleteService } from '../../shared/header/services/cascade-delete';
import { AcademicState } from '../../shared/header/academic-state';

interface ClassRow extends Class {
  editing: boolean;
  draft: Partial<Class>;
  selected: boolean;
}

@Component({
  selector: 'app-class-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './class-view.html',
  styleUrl: './class-view.css',
})
export class ClassView implements OnInit {
  private readService   = inject(AcademicReadService);
  private readonly cdr = inject(ChangeDetectorRef);
  private updateService = inject(AcademicUpdateService);
  private deleteService = inject(CascadeDeleteService);
  private state = inject(AcademicState);
  private router = inject(Router);

  selectedYear: AcademicYear | null = null;
  rows: ClassRow[] = [];
  loading = false;
  saving  = false;
  successMessage = '';
  errorMessage   = '';

  get allSelected() { return this.rows.length > 0 && this.rows.every(r => r.selected); }
  get anySelected() { return this.rows.some(r => r.selected); }
  get anyEditing()  { return this.rows.some(r => r.editing); }

  ngOnInit() {
    this.state.selectedAcademicYear$.subscribe(year => {
      this.selectedYear = year;
      if (year) this.loadData(year.academicYearId);
    });
  }

  loadData(academicYearId: number) {
    this.loading = true;
    this.readService.getClassesByAcademicYearId(academicYearId).subscribe({
      next: (res) => {
        this.rows = (res.data || []).map(c => ({ ...c, editing: false, draft: {}, selected: false }));
        this.state.setClasses(res.data || []);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.errorMessage = 'Failed to load classes.'; }
    });
  }

  startEdit(row: ClassRow) {
    row.editing = true;
    row.draft = { className: row.className, feeAmount: row.feeAmount, isConnected: row.isConnected, isFinanceConnected: row.isFinanceConnected };
  }

  cancelEdit(row: ClassRow) { row.editing = false; row.draft = {}; }

  saveRow(row: ClassRow) {
    this.saving = true;
    this.updateService.updateClasses({ id: row.classId, data: row.draft }).subscribe({
      next: () => {
        Object.assign(row, row.draft);
        row.editing = false; row.draft = {};
        this.saving = false;
        this.successMessage = 'Updated successfully.';
        this.clearMessages();
        this.cdr.markForCheck();
      },
      error: (err) => { this.saving = false; this.errorMessage = err?.error?.message || 'Update failed.'; this.clearMessages(); }
    });
  }

  bulkSave() {
    const editing = this.rows.filter(r => r.editing);
    if (!editing.length) return;
    this.saving = true;
    this.updateService.updateClasses({ id: editing.map(r => r.classId), data: editing.map(r => r.draft) }).subscribe({
      next: () => {
        editing.forEach(r => { Object.assign(r, r.draft); r.editing = false; r.draft = {}; });
        this.saving = false; this.successMessage = 'Bulk update successful.'; this.clearMessages();
        this.cdr.markForCheck();
      },
      error: (err) => { this.saving = false; this.errorMessage = err?.error?.message || 'Bulk update failed.'; this.clearMessages(); }
    });
  }

  toggleAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.rows.forEach(r => r.selected = checked);
  }

  deleteRow(row: ClassRow) {
    if (!confirm(`Delete class "${row.className}"? This will cascade delete books.`)) return;
    this.deleteService.cascadeDelete({ classIds: [row.classId] }).subscribe({
      next: () => {
        this.rows = this.rows.filter(r => r.classId !== row.classId);
        this.successMessage = 'Deleted.'; this.clearMessages();
        this.cdr.markForCheck();
      },
      error: (err) => { this.errorMessage = err?.error?.message || 'Delete failed.'; this.clearMessages(); }
    });
  }

  bulkDelete() {
    const selected = this.rows.filter(r => r.selected);
    if (!selected.length || !confirm(`Delete ${selected.length} class(es) and all related books?`)) return;
    this.deleteService.cascadeDelete({ classIds: selected.map(r => r.classId) }).subscribe({
      next: () => {
        this.rows = this.rows.filter(r => !r.selected);
        this.successMessage = 'Bulk delete successful.'; this.clearMessages();
        this.cdr.markForCheck();
      },
      error: (err) => { this.errorMessage = err?.error?.message || 'Bulk delete failed.'; this.clearMessages(); }
    });
  }

  viewBooks(row: ClassRow) {
    // pass selected class to state and navigate
    this.router.navigate(['/books-view']);
  }

  goToCreate() { this.router.navigate(['/class-create']); }

  private clearMessages() {
    setTimeout(() => { this.successMessage = ''; this.errorMessage = ''; }, 3000);
  }
}