import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AcademicSetupService } from '../../shared/header/services/academic-setup';

/* ======================================================
   TYPES
====================================================== */

interface AcademicYearDraft {
  yearLabel: string;
  startDate: string;
  endDate: string | null;
  isCurrentYear: boolean;
}

/* ======================================================
   COMPONENT
====================================================== */

@Component({
  selector: 'app-academic-years-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './academic-years-create.html',
  styleUrls: ['./academic-years-create.css'],
})
export class AcademicYearsCreate {

  private setupService = inject(AcademicSetupService);
  private router = inject(Router);

  drafts: AcademicYearDraft[] = [this.createEmptyDraft()];

  saving = false;
  successMessage = '';
  errorMessage = '';

  /* ======================================================
     CREATE EMPTY ROW
  ====================================================== */
  createEmptyDraft(): AcademicYearDraft {
    return {
      yearLabel: '',
      startDate: '',
      endDate: null,
      isCurrentYear: false,
    };
  }

  /* ======================================================
     ADD ROW
  ====================================================== */
  addRow(): void {
    this.drafts.push(this.createEmptyDraft());
  }

  /* ======================================================
     REMOVE ROW
  ====================================================== */
  removeRow(index: number): void {
    if (this.drafts.length > 1) {
      this.drafts.splice(index, 1);
    }
  }

  /* ======================================================
     VALIDATION
  ====================================================== */
  isValid(): boolean {
    const hasRequired = this.drafts.every(d =>
      d.yearLabel.trim().length > 0 &&
      d.startDate.trim().length > 0
    );

    const onlyOneCurrentYear =
      this.drafts.filter(d => d.isCurrentYear).length <= 1;

    const validDates = this.drafts.every(d => {
      if (!d.endDate) return true;
      return new Date(d.startDate) <= new Date(d.endDate);
    });

    return hasRequired && onlyOneCurrentYear && validDates;
  }

  /* ======================================================
     SAVE ALL (FIXED + CLEAN FLOW)
  ====================================================== */
  async saveAll(): Promise<void> {
    if (!this.isValid()) {
      this.errorMessage =
        'Please fix validation errors before saving.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    let successCount = 0;
    let failed = false;

    for (const d of this.drafts) {
      try {
        const res = await this.setupService
          .createAcademicSetup({
            academicYear: {
              yearLabel: d.yearLabel.trim(),
              startDate: d.startDate,
              endDate: d.endDate ?? null,
              isCurrentYear: d.isCurrentYear,
            },
            classes: [],
            uniforms: [],
          })
          .toPromise();

        if (!res?.success) {
          failed = true;
        } else {
          successCount++;
        }

      } catch (err) {
        failed = true;
      }
    }

    this.saving = false;

    if (failed) {
      this.errorMessage =
        'Some academic years failed to create.';
      return;
    }

    this.successMessage =
      `Successfully created ${successCount} academic year(s)!`;

    this.drafts = [this.createEmptyDraft()];
  }

  /* ======================================================
     NAVIGATION
  ====================================================== */
  goToView(): void {
    this.router.navigate(['/academic-management/academic-years']);
  }
}