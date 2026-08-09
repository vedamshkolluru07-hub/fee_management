// src/app/core/services/website.ts
//
// Shared types + services for the public website CMS
// (home page builder, about page, enquiries, connect links, theme).

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment.development';

/* ======================================================
   🔹 SHARED TYPES
====================================================== */

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: { page: number; pageSize: number; total: number };
}

export type BlockStatus = 'draft' | 'published';
export type HomeBlockType = 'text' | 'image';

export interface HomeBlockImage {
  url: string;
  thumbnailUrl?: string;
  s3Key?: string;
  caption?: string;
}

export interface HomeBlock {
  id: number;
  status: BlockStatus;
  block_type: HomeBlockType;
  text_content: string | null;
  images: HomeBlockImage[];
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  z_index: number;
  style: Record<string, string>;
}

export interface AboutBlock {
  id: number;
  status: BlockStatus;
  text_content: string;
  display_order: number;
}

export interface EnquiryType {
  id: number;
  code: string;
  label: string;
  display_order: number;
  is_active: boolean;
}

export interface Enquiry {
  id: number;
  phone: string;
  message: string;
  enquiry_type_id: number;
  enquiry_type_code?: string;
  enquiry_type_label?: string;
  status: 'new' | 'in_progress' | 'resolved';
  created_at: string;
}

export type ConnectPlatform =
  | 'whatsapp' | 'instagram' | 'facebook' | 'email'
  | 'phone' | 'youtube' | 'linkedin' | 'twitter';

export interface ConnectLinkPublic {
  platform: ConnectPlatform;
  href: string;
}

export interface ConnectLinkAdmin {
  id: number;
  platform: ConnectPlatform;
  value: string;
  is_enabled: boolean;
  display_order: number;
}

export interface SiteTheme {
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
}

/* ======================================================
   🔹 PUBLIC CONTENT SERVICE — home / about / theme (no auth)
====================================================== */

@Injectable({ providedIn: 'root' })
export class PublicContentService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/website`;

  getPublishedHomeBlocks(): Observable<ApiResponse<HomeBlock[]>> {
    return this.http.get<ApiResponse<HomeBlock[]>>(`${this.base}/home/published`);
  }

  getPublishedAboutBlocks(): Observable<ApiResponse<AboutBlock[]>> {
    return this.http.get<ApiResponse<AboutBlock[]>>(`${this.base}/about/published`);
  }

  getTheme(): Observable<ApiResponse<SiteTheme>> {
    return this.http.get<ApiResponse<SiteTheme>>(`${this.base}/theme`);
  }
}

/* ======================================================
   🔹 ENQUIRY SERVICE — submit (public) + types (public)
====================================================== */

@Injectable({ providedIn: 'root' })
export class EnquiryService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/website`;

  getActiveTypes(): Observable<ApiResponse<EnquiryType[]>> {
    return this.http.get<ApiResponse<EnquiryType[]>>(`${this.base}/enquiry-types`);
  }

  submit(payload: { phone: string; message: string; enquiryTypeId: number }): Observable<ApiResponse<Enquiry>> {
    return this.http.post<ApiResponse<Enquiry>>(`${this.base}/enquiries`, payload);
  }
}

/* ======================================================
   🔹 CONNECT LINKS SERVICE — public enabled links
====================================================== */

@Injectable({ providedIn: 'root' })
export class ConnectLinksService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/website/connect-links`;

  getEnabledLinks(): Observable<ApiResponse<ConnectLinkPublic[]>> {
    return this.http.get<ApiResponse<ConnectLinkPublic[]>>(this.base);
  }
}
