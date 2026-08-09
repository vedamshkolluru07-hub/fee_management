// src/app/shared/enquiry-box/enquiry-box.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnquiryService, EnquiryType } from '../../core/services/website';

@Component({
  selector: 'app-enquiry-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enquiry-box.html',
  styleUrl: './enquiry-box.css',
})
export class EnquiryBoxComponent implements OnInit {
  private enquiryService = inject(EnquiryService);

  // ======================================================
  // FORM STATE
  // ======================================================
  phone = '';
  message = '';
  enquiryTypeId: number | null = null;

  // ======================================================
  // UI STATE
  // ======================================================
  types = signal<EnquiryType[]>([]);
  submitting = signal(false);
  submitted = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.enquiryService.getActiveTypes().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.types.set(res.data);
          // default to first type (Admission) if present
          if (res.data.length) {
            this.enquiryTypeId = res.data[0].id;
          }
        }
      },
    });
  }

  submit(): void {
    this.errorMessage.set(null);

    if (!this.phone.trim()) {
      this.errorMessage.set('Please enter your phone number.');
      return;
    }
    if (!this.message.trim()) {
      this.errorMessage.set('Please enter your message.');
      return;
    }
    if (!this.enquiryTypeId) {
      this.errorMessage.set('Please select an enquiry type.');
      return;
    }

    this.submitting.set(true);

    this.enquiryService
      .submit({
        phone: this.phone.trim(),
        message: this.message.trim(),
        enquiryTypeId: this.enquiryTypeId,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          if (res.success) {
            this.submitted.set(true);
            this.phone = '';
            this.message = '';
          } else {
            this.errorMessage.set(res.message || 'Something went wrong. Please try again.');
          }
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(err?.error?.message || 'Something went wrong. Please try again.');
        },
      });
  }

  resetForm(): void {
    this.submitted.set(false);
  }
}
