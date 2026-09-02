// src/app/shared/sidebar/services/connect-links.ts

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, ConnectLinkAdmin, ConnectPlatform, SiteTheme } from '../../../core/services/website';

@Injectable({ providedIn: 'root' })
export class ConnectLinksAdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/website/connect-links`;
  private themeBase = `${environment.apiUrl}/website/theme`;

  getAllLinks(): Observable<ApiResponse<ConnectLinkAdmin[]>> {
    return this.http.get<ApiResponse<ConnectLinkAdmin[]>>(`${this.base}/all`);
  }

  updateLink(platform: ConnectPlatform, changes: { value?: string; isEnabled?: boolean }): Observable<ApiResponse<ConnectLinkAdmin>> {
    return this.http.put<ApiResponse<ConnectLinkAdmin>>(`${this.base}/${platform}`, changes);
  }

  getTheme(): Observable<ApiResponse<SiteTheme>> {
    return this.http.get<ApiResponse<SiteTheme>>(this.themeBase);
  }

  updateTheme(payload: Partial<{ primaryColor: string; secondaryColor: string; backgroundColor: string; textColor: string }>): Observable<ApiResponse<SiteTheme>> {
    return this.http.put<ApiResponse<SiteTheme>>(this.themeBase, payload);
  }
}
