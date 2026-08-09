// src/app/shared/sidebar/services/enquiries.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment.development';
import { ApiResponse, Enquiry, EnquiryType } from '../../../core/services/website';

export interface EnquiryFilters {
  status?: string;
  enquiryTypeId?: number;
  search?: string;
  page?: number;
  pageSize?: number;
}

@Injectable({ providedIn: 'root' })
export class EnquiriesAdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/website/enquiries`;
  private typesBase = `${environment.apiUrl}/website/enquiry-types`;

  list(filters: EnquiryFilters): Observable<ApiResponse<Enquiry[]>> {
    let params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.enquiryTypeId) params.set('enquiryTypeId', String(filters.enquiryTypeId));
    if (filters.search) params.set('search', filters.search);
    params.set('page', String(filters.page ?? 1));
    params.set('pageSize', String(filters.pageSize ?? 20));

    return this.http.get<ApiResponse<Enquiry[]>>(`${this.base}?${params.toString()}`);
  }

  updateStatus(id: number, status: string): Observable<ApiResponse<Enquiry>> {
    return this.http.patch<ApiResponse<Enquiry>>(`${this.base}/${id}/status`, { status });
  }

  remove(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.base}/${id}`);
  }

  getAllTypes(): Observable<ApiResponse<EnquiryType[]>> {
    return this.http.get<ApiResponse<EnquiryType[]>>(`${this.typesBase}/all`);
  }
}
