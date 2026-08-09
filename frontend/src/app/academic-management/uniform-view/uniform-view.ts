import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AcademicReadService, Uniform, AcademicYear } from '../../shared/header/services/academic-read';
import { AcademicUpdateService } from '../../shared/header/services/academic-update';
import { CascadeDeleteService } from '../../shared/header/services/cascade-delete';
import { AcademicState } from '../../shared/header/academic-state';

interface UniformRow extends Uniform {
  editing: boolean;
  draft: Partial<Uniform>;
  selected: boolean;
}

@Component({
  selector: 'app-uniform-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './uniform-view.html',
  styleUrl: './uniform-view.css',
})
export class UniformView implements OnInit {
  private readService   = inject(AcademicReadService);
  private readonly cdr = inject(ChangeDetectorRef);
  private updateService = inject(AcademicUpdateService);
  private deleteService = inject(CascadeDeleteService);
  private state = inject(AcademicState);
  private router = inject(Router);

  selectedYear: AcademicYear | null = null;
  rows: UniformRow[] = [];

  // Filter state
  filterGender = '';
  filterType   = '';

  loading = false;
  saving  = false;
  successMessage = '';
  errorMessage   = '';

  get allSelected() { return this.rows.length > 0 && this.rows.every(r => r.selected); }
  get anySelected() { return this.rows.some(r => r.selected); }
  get anyEditing()  { return this.rows.some(r => r.editing); }

  get filteredRows(): UniformRow[] {
    return this.rows.filter(r => {
      const genderMatch = !this.filterGender || r.gender === this.filterGender;
      const typeMatch   = !this.filterType   || r.uniformType.toLowerCase().includes(this.filterType.toLowerCase());
      return genderMatch && typeMatch;
    });
  }

  ngOnInit() {
    this.state.selectedAcademicYear$.subscribe(year => {
      this.selectedYear = year;
      if (year) this.loadData(year.academicYearId);
    });
  }

  loadData(academicYearId: number) {
    this.loading = true;
    this.readService.getUniformsByAcademicYearId(academicYearId).subscribe({
      next: (res) => {
        this.rows = (res.data || []).map(u => ({ ...u, editing: false, draft: {}, selected: false }));
        this.state.setUniforms(res.data || []);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => { this.loading = false; this.errorMessage = 'Failed to load uniforms.'; }
    });
  }

  startEdit(row: UniformRow) {
    row.editing = true;
    row.draft = {
      gender: row.gender,
      uniformType: row.uniformType,
      size: row.size,
      uniformAmount: row.uniformAmount,
      isConnected: row.isConnected,
    };
  }

  cancelEdit(row: UniformRow) { row.editing = false; row.draft = {}; }

  saveRow(row: UniformRow) {
    this.saving = true;
    this.updateService.updateUniforms({ id: row.uniformId, data: row.draft }).subscribe({
      next: () => {
        Object.assign(row, row.draft);
        row.editing = false; row.draft = {};
        this.saving = false; this.successMessage = 'Updated.'; this.clearMessages();
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

  bulkSave() {
    const editing = this.rows.filter(r => r.editing);
    if (!editing.length) return;
    this.saving = true;
    this.updateService.updateUniforms({
      id: editing.map(r => r.uniformId),
      data: editing.map(r => r.draft)
    }).subscribe({
      next: () => {
        editing.forEach(r => { Object.assign(r, r.draft); r.editing = false; r.draft = {}; });
        this.saving = false; this.successMessage = 'Bulk update successful.'; this.clearMessages();
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

  toggleAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.filteredRows.forEach(r => r.selected = checked);
  }

  deleteRow(row: UniformRow) {
    if (!confirm(`Delete uniform "${row.uniformType} (${row.gender})"?`)) return;
    this.deleteService.cascadeDelete({ uniformIds: [row.uniformId] }).subscribe({
      next: () => {
        this.rows = this.rows.filter(r => r.uniformId !== row.uniformId);
        this.successMessage = 'Deleted.'; this.clearMessages();
        this.cdr.markForCheck();
      },
      error: (err) => { this.errorMessage = err?.error?.message || 'Delete failed.'; this.clearMessages(); }
    });
  }

  bulkDelete() {
    const selected = this.filteredRows.filter(r => r.selected);
    if (!selected.length || !confirm(`Delete ${selected.length} uniform(s)?`)) return;
    this.deleteService.cascadeDelete({ uniformIds: selected.map(r => r.uniformId) }).subscribe({
      next: () => {
        const ids = new Set(selected.map(r => r.uniformId));
        this.rows = this.rows.filter(r => !ids.has(r.uniformId));
        this.successMessage = 'Bulk delete successful.'; this.clearMessages();
        this.cdr.markForCheck();
      },
      error: (err) => { this.errorMessage = err?.error?.message || 'Bulk delete failed.'; this.clearMessages(); }
    });
  }

  goToCreate() { this.router.navigate(['/uniform-create']); }

  private clearMessages() { setTimeout(() => { this.successMessage = ''; this.errorMessage = ''; }, 3000); }
}