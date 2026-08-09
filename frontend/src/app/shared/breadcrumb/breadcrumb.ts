// src/app/shared/breadcrumb/breadcrumb.ts

import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, Subject, takeUntil } from 'rxjs';

export interface Crumb {
  label: string;
  url: string;
}

const ROUTE_LABELS: Record<string, string> = {
  'dashboard':             '🏠 Dashboard',
  'add-student':           '➕ Add Student',
  'view-student':          '👁️ View Students',
  'update-student':        '✏️ Update Student',
  'bulk-student-upload':   '📤 Bulk Upload',
  'promote-student':       '🎓 Promote Student',
  'student-model':         '📋 Student Details',
  'payments':              '💳 Payments',
  'academic-years-create': '📅 Create Academic Year',
  'academic-years-view':   '📅 View Academic Years',
  'class-create':          '🏫 Create Class',
  'class-view':            '🏫 View Classes',
  'books-create':          '📚 Create Books',
  'books-view':            '📚 View Books',
  'uniform-create':        '👔 Create Uniform',
  'uniform-view':          '👔 View Uniforms',
  'app-settings':          '⚙️ App Settings',
  'audit-logs':            '📋 Audit Logs',
  'calendar':              '📅 Calendar',
  'device-session':        '💻 Device Sessions',
  'login-attempts':        '🔐 Login Attempts',
  'notification':          '🔔 Notifications',
  'otp-request':           '🔑 OTP Requests',
  'password-reset':        '🔒 Password Reset',
  'token':                 '🎫 Tokens',
  'user':                  '👤 User Management',
};

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <nav class="breadcrumb-nav" *ngIf="crumbs.length > 1" aria-label="Breadcrumb">
      <ol class="breadcrumb-list">
        <li *ngFor="let crumb of crumbs; let last = last; let i = index" class="breadcrumb-item">
          <a *ngIf="!last" [routerLink]="crumb.url" class="breadcrumb-link">
            {{ crumb.label }}
          </a>
          <span *ngIf="last" class="breadcrumb-current">{{ crumb.label }}</span>
          <span *ngIf="!last" class="breadcrumb-sep" aria-hidden="true">›</span>
        </li>
      </ol>
    </nav>
  `,
  styleUrls: ['./breadcrumb.css'],
})
export class BreadcrumbComponent implements OnInit, OnDestroy {

  crumbs: Crumb[] = [];
  private destroy$ = new Subject<void>();

  constructor(private router: Router,
    private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.build(this.router.url);

    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((e: any) => this.build(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private build(url: string): void {
    const path = url.split('?')[0];
    const segments = path.split('/').filter(Boolean);

    this.crumbs = [{ label: '🏠 Home', url: '/dashboard' }];

    if (segments.length && segments[0] !== 'dashboard') {
      const seg = segments[0];
      this.crumbs.push({
        label: ROUTE_LABELS[seg] || this.toTitle(seg),
        url: '/' + seg,
      });
    }

    this.cdr.markForCheck();
  }

  private toTitle(s: string): string {
    return s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}