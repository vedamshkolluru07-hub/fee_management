// src/app/shared/sidebar/enquiries/enquiries.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnquiriesAdminService } from '../services/enquiries';
import { Enquiry, EnquiryType } from '../../../core/services/website';

@Component({
  selector: 'app-enquiries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './enquiries.html',
  styleUrl: './enquiries.css',
})
export class EnquiriesComponent implements OnInit {
  private service = inject(EnquiriesAdminService);

  enquiries = signal<Enquiry[]>([]);
  types = signal<EnquiryType[]>([]);
  loading = signal(true);
  total = signal(0);

  statusFilter = '';
  typeFilter: number | null = null;
  searchFilter = '';
  page = 1;
  pageSize = 20;

  ngOnInit(): void {
    this.service.getAllTypes().subscribe({
      next: (res) => { if (res.success && res.data) this.types.set(res.data); },
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.service
      .list({
        status: this.statusFilter || undefined,
        enquiryTypeId: this.typeFilter ?? undefined,
        search: this.searchFilter || undefined,
        page: this.page,
        pageSize: this.pageSize,
      })
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          if (res.success && res.data) {
            this.enquiries.set(res.data);
            this.total.set(res.pagination?.total ?? 0);
          }
        },
        error: () => this.loading.set(false),
      });
  }

  applyFilters(): void {
    this.page = 1;
    this.load();
  }

  changeStatus(enquiry: Enquiry, status: string): void {
    this.service.updateStatus(enquiry.id, status).subscribe({
      next: (res) => {
        if (res.success) {
          this.enquiries.update((list) =>
            list.map((e) => (e.id === enquiry.id ? { ...e, status: status as Enquiry['status'] } : e))
          );
        }
      },
    });
  }

  remove(enquiry: Enquiry): void {
    if (!confirm('Delete this enquiry?')) return;
    this.service.remove(enquiry.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.enquiries.update((list) => list.filter((e) => e.id !== enquiry.id));
        }
      },
    });
  }

  nextPage(): void {
    if (this.page * this.pageSize >= this.total()) return;
    this.page += 1;
    this.load();
  }

  prevPage(): void {
    if (this.page <= 1) return;
    this.page -= 1;
    this.load();
  }
}
