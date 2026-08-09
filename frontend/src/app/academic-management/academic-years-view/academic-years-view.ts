import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AcademicYear } from '../../shared/header/services/academic-read';
import { AcademicReadService } from '../../shared/header/services/academic-read';
import { AcademicUpdateService } from '../../shared/header/services/academic-update';
import { CascadeDeleteService } from '../../shared/header/services/cascade-delete';
import { AcademicState } from '../../shared/header/academic-state';

interface AcademicYearRow extends AcademicYear {
  editing: boolean;
  draft: Partial<AcademicYear>;
  selected: boolean;
}

@Component({
  selector: 'app-academic-years-view',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './academic-years-view.html',
  styleUrl: './academic-years-view.css',
})
export class AcademicYearsView implements OnInit {

  private readService = inject(AcademicReadService);
  private readonly cdr = inject(ChangeDetectorRef);
  private updateService = inject(AcademicUpdateService);
  private deleteService = inject(CascadeDeleteService);
  private state = inject(AcademicState);
  private router = inject(Router);

  rows: AcademicYearRow[] = [];

  loading = false;
  saving = false;

  successMessage = '';
  errorMessage = '';

  // ===== MODULE SELECTOR STATE =====
  moduleMenuOpen = false;
  selectedRow: AcademicYearRow | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  /**
   * LOAD DATA
   */
  loadData(): void {
    this.loading = true;

    this.readService.getAllAcademicYears().subscribe({
      next: (res) => {
        const years = res.data ?? [];

        this.rows = years.map((year) => ({
          ...year,
          editing: false,
          draft: {},
          selected: false,
        }));

        this.state.setAcademicYears(years);

        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Failed to load academic years.';
        this.clearMessages();
        this.cdr.markForCheck();
      },
    });
  }

  // ===== SELECTION =====
  get allSelected(): boolean {
    return this.rows.length > 0 && this.rows.every(r => r.selected);
  }

  get anySelected(): boolean {
    return this.rows.some(r => r.selected);
  }

  get anyEditing(): boolean {
    return this.rows.some(r => r.editing);
  }

  toggleAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.rows.forEach(r => r.selected = checked);
  }

  // ===== EDIT =====
  startEdit(row: AcademicYearRow): void {
    row.editing = true;
    row.draft = {
      yearLabel: row.yearLabel,
      startDate: row.startDate,
      endDate: row.endDate,
      isCurrentYear: row.isCurrentYear,
      isConnected: row.isConnected,
    };
  }

  cancelEdit(row: AcademicYearRow): void {
    row.editing = false;
    row.draft = {};
  }

  saveRow(row: AcademicYearRow): void {
    this.saving = true;

    this.updateService.updateAcademicYear({
      id: row.academicYearId,
      data: row.draft
    }).subscribe({
      next: () => {
        Object.assign(row, row.draft);
        row.editing = false;
        row.draft = {};
        this.saving = false;

        this.syncState();
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

  bulkSave(): void {
    const editingRows = this.rows.filter(r => r.editing);
    if (!editingRows.length) return;

    this.saving = true;

    this.updateService.updateAcademicYear({
      id: editingRows.map(r => r.academicYearId),
      data: editingRows.map(r => r.draft)
    }).subscribe({
      next: () => {
        editingRows.forEach(r => {
          Object.assign(r, r.draft);
          r.editing = false;
          r.draft = {};
        });

        this.saving = false;
        this.syncState();

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

  // ===== DELETE =====
  deleteRow(row: AcademicYearRow, forceDelete: boolean = false): void {
    const confirmMessage = forceDelete
      ? `Force delete "${row.yearLabel}"? This will remove it even if it's still connected.`
      : `Delete "${row.yearLabel}"?`;

    if (!confirm(confirmMessage)) return;

    this.deleteService.cascadeDelete({
      academicYearIds: [row.academicYearId],
      forceDelete
    }).subscribe({
      next: () => {
        this.rows = this.rows.filter(r => r.academicYearId !== row.academicYearId);
        this.syncState();

        this.successMessage = forceDelete
          ? 'Force deleted successfully.'
          : 'Deleted successfully.';
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

  bulkDelete(forceDelete: boolean = false): void {
    const selected = this.rows.filter(r => r.selected);
    if (!selected.length) return;

    const confirmMessage = forceDelete
      ? `Force delete ${selected.length} years? This will remove them even if still connected.`
      : `Delete ${selected.length} years?`;

    if (!confirm(confirmMessage)) return;

    this.deleteService.cascadeDelete({
      academicYearIds: selected.map(r => r.academicYearId),
      forceDelete
    }).subscribe({
      next: () => {
        this.rows = this.rows.filter(r => !r.selected);
        this.syncState();

        this.successMessage = forceDelete
          ? 'Bulk force delete successful.'
          : 'Bulk delete successful.';
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

  // ===== CREATE =====
  goToCreate(): void {
    this.router.navigate(['/academic-years-create']);
  }

  // ===== MODULE SELECTOR =====
  openModuleSelector(row: AcademicYearRow): void {
    this.selectedRow = row;
    this.moduleMenuOpen = true;
  }

  closeModuleMenu(): void {
    this.moduleMenuOpen = false;
    this.selectedRow = null;
  }

  goToModule(route: 'class-view' | 'uniform-view'): void {
    if (!this.selectedRow) return;

    this.moduleMenuOpen = false;

    this.state.setSelectedAcademicYear(this.selectedRow);

    this.router.navigate([`/${route}`]);
  }

  // ===== STATE SYNC =====
  private syncState(): void {
    this.state.setAcademicYears(
      this.rows.map(({ editing, draft, selected, ...y }) => y)
    );
  }

  // ===== MESSAGES =====
  private clearMessages(): void {
    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 3000);
  }
}