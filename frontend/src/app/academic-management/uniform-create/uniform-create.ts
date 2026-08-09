import {
  Component,
  inject,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AcademicSetupService, UniformPayload } from '../../shared/header/services/academic-setup';
import { AcademicState } from '../../shared/header/academic-state';
import { AcademicYear } from '../../shared/header/services/academic-read';

interface UniformDraft {
  gender: 'Male' | 'Female' | '';
  uniformType: string;
  size: string;
  uniformAmount: number | null;
}

@Component({
  selector: 'app-uniform-create',
  imports: [CommonModule, FormsModule],
  templateUrl: './uniform-create.html',
  styleUrl: './uniform-create.css',
})
export class UniformCreate implements OnInit {
  private setupService = inject(AcademicSetupService);
  private readonly cdr = inject(ChangeDetectorRef);
  private state = inject(AcademicState);
  private router = inject(Router);

  selectedYear: AcademicYear | null = null;
  drafts: UniformDraft[] = [this.emptyDraft()];

  saving = false;
  successMessage = '';
  errorMessage = '';

  ngOnInit() {
    this.state.selectedAcademicYear$.subscribe(y => this.selectedYear = y);
  }

  emptyDraft(): UniformDraft {
    return { gender: '', uniformType: '', size: '', uniformAmount: null };
  }

  addRow() { this.drafts.push(this.emptyDraft()); }

  removeRow(i: number) { if (this.drafts.length > 1) this.drafts.splice(i, 1); }

  isValid(): boolean {
    return !!this.selectedYear &&
      this.drafts.every(d => d.gender && d.uniformType.trim());
  }

  saveAll() {
    if (!this.isValid() || !this.selectedYear) {
      this.errorMessage = 'Select an academic year and fill in Gender and Uniform Type for all rows.';
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const uniforms: UniformPayload[] = this.drafts.map(d => ({
      gender: d.gender as 'Male' | 'Female',
      uniformType: d.uniformType,
      size: d.size || undefined,
      uniformAmount: d.uniformAmount ?? 0,
    }));

    this.setupService.createUniformsForAcademicYear(this.selectedYear.academicYearId, uniforms).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Uniforms created successfully!';
        this.drafts = [this.emptyDraft()];
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage = err?.error?.message || 'Failed to create uniforms.';
        this.cdr.markForCheck();
      }
    });
  }

  goToView() { this.router.navigate(['/academic-management/uniforms']); }
}