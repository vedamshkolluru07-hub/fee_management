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
  ClassPayload
} from '../../shared/header/services/academic-setup';

import { AcademicState } from '../../shared/header/academic-state';
import { AcademicYear } from '../../shared/header/services/academic-read';

interface ClassDraft {
  className: string;
  feeAmount: number;
}

@Component({
  selector: 'app-class-create',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './class-create.html',
  styleUrl: './class-create.css',
})
export class ClassCreate implements OnInit, OnDestroy {

  private setupService = inject(AcademicSetupService);
  private readonly cdr = inject(ChangeDetectorRef);
  private state = inject(AcademicState);
  private router = inject(Router);

  private sub = new Subscription();

  selectedYear: AcademicYear | null = null;

  selectedStep: number = 100;
  saving = false;

  successMessage = '';
  errorMessage = '';

  private readonly classList: string[] = [
    'Nursery', 'LKG', 'UKG',
    'Class 1', 'Class 2', 'Class 3',
    'Class 4', 'Class 5', 'Class 6',
    'Class 7', 'Class 8', 'Class 9', 'Class 10'
  ];

  drafts: ClassDraft[] = [];

  // ================= INIT =================
  ngOnInit(): void {
    this.sub.add(
      this.state.selectedAcademicYear$.subscribe(year => {
        this.selectedYear = year;
      })
    );

    this.initializeDrafts();
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  // ================= INIT DATA =================
  initializeDrafts(): void {
    this.drafts = this.classList.map(name => ({
      className: name,
      feeAmount: 0
    }));
  }

  // ================= SAFE NUMBER =================
  private toNumber(value: any): number {
    const n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  // ================= FEE LOGIC =================
  updateFromIndex(index: number, value: any): void {
    const safeValue = Math.max(0, this.toNumber(value));

    const oldValue = this.drafts[index].feeAmount;
    const diff = safeValue - oldValue;

    this.drafts[index].feeAmount = safeValue;

    for (let i = index + 1; i < this.drafts.length; i++) {
      const current = this.drafts[i].feeAmount;
      this.drafts[i].feeAmount = Math.max(0, current + diff);
    }
  }

  increaseFrom(index: number, amount: number): void {
    const current = this.drafts[index].feeAmount;
    this.updateFromIndex(index, current + this.toNumber(amount));
  }

  decreaseFrom(index: number, amount: number): void {
    const current = this.drafts[index].feeAmount;
    this.updateFromIndex(index, current - this.toNumber(amount));
  }

  // ================= VALIDATION =================
  isValid(): boolean {
    return !!this.selectedYear && this.drafts.every(d => d.className && d.className.trim().length > 0);
  }

  // ================= SAVE =================
  saveAll(): void {
    if (!this.selectedYear) {
      this.errorMessage = 'Select an academic year.';
      return;
    }

    const classes: ClassPayload[] = this.drafts.map(d => ({
      className: d.className.trim(),
      feeAmount: this.toNumber(d.feeAmount)
    }));

    this.saving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.setupService.createClassesForAcademicYear(
      this.selectedYear.academicYearId,
      classes
    ).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Classes created successfully!';
        this.initializeDrafts();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.saving = false;
        this.errorMessage =
          err?.error?.message || 'Failed to create classes.';
        this.cdr.markForCheck();
      }
    });
  }

  // ================= NAV =================
  goToView(): void {
    this.router.navigate(['/academic-management/classes']);
  }
}