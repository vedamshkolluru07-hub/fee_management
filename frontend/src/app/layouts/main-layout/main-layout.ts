// ======================================================
// src/app/layouts/main-layout/main-layout.ts
// ======================================================

import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';

import { Router, RouterOutlet } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';

import { Header } from '../../shared/header/header';
import { Sidebar } from '../../shared/sidebar/sidebar';
import { BreadcrumbComponent } from '../../shared/breadcrumb/breadcrumb';

import {
  SocketService,
  CalendarReminder
} from '../../shared/sidebar/services/socket';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    Header,
    Sidebar,
    BreadcrumbComponent
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.css',
})
export class MainLayout implements OnInit, OnDestroy {

  /* =====================================================
     CLEANUP HANDLER
  ===================================================== */
  private destroy$ = new Subject<void>();

  /* =====================================================
     SIDEBAR STATES
  ===================================================== */
  isSidebarOpen = false;
  isSidebarPinned = false;
  userRole = '';

  /* =====================================================
     WATERMARK STATE
  ===================================================== */
  showWatermark = false;
  private watermarkTimeout: any;

  /* =====================================================
     FOOTER STATE
  ===================================================== */
  showFooter = false;
  private footerTimeout: any;

  /* =====================================================
     📅 CALENDAR REMINDER STATE
  ===================================================== */
  activeReminder: CalendarReminder | null = null;
  private reminderTimeout: any;

  constructor(private socketService: SocketService,
    private router: Router,
    private cdr: ChangeDetectorRef) {}

  /* =====================================================
     INIT SOCKET LISTENER
  ===================================================== */
  ngOnInit(): void {

    this.socketService.reminder$
      .pipe(takeUntil(this.destroy$))
      .subscribe((reminder) => {

        if (!reminder) return;

        this.activeReminder = reminder;

        // reset existing timeout
        if (this.reminderTimeout) {
          clearTimeout(this.reminderTimeout);
        }

        // auto-hide after 8 seconds
        this.reminderTimeout = setTimeout(() => {
          this.activeReminder = null;
          this.cdr.markForCheck();
        }, 8000);

        this.cdr.markForCheck();
      });
  }

  /* =====================================================
     SIDEBAR TOGGLE
  ===================================================== */
  onSidebarToggle(event: {
    open: boolean;
    pinned: boolean;
    role: string;
  }): void {

    this.isSidebarOpen = event.open;
    this.isSidebarPinned = event.pinned;
    this.userRole = event.role;
  }

  onSidebarClose(): void {
    if (this.isSidebarPinned) return;
    this.isSidebarOpen = false;
  }

  /* =====================================================
     📅 CALENDAR REMINDER ACTIONS
  ===================================================== */
  closeReminder(): void {
    this.activeReminder = null;
  }

  goToCalendar(): void {
    this.activeReminder = null;
    this.router.navigate(['/calendar']);
  }

  /* =====================================================
     SECRET SHORTCUT
     CTRL + SHIFT + V
  ===================================================== */
  @HostListener('document:keydown', ['$event'])
  handleSecretShortcut(event: KeyboardEvent): void {

    const secretPressed =
      event.ctrlKey &&
      event.shiftKey &&
      event.key.toLowerCase() === 'v';

    if (!secretPressed) return;

    event.preventDefault();

    this.displayWatermark();
    this.displayFooter();
  }

  /* =====================================================
     WATERMARK
  ===================================================== */
  private displayWatermark(): void {

    if (this.watermarkTimeout) {
      clearTimeout(this.watermarkTimeout);
    }

    this.showWatermark = false;

    setTimeout(() => {

      this.showWatermark = true;

      this.watermarkTimeout = setTimeout(() => {
        this.showWatermark = false;
      }, 4000);

    }, 10);
  }

  /* =====================================================
     FOOTER
  ===================================================== */
  private displayFooter(): void {

    if (this.footerTimeout) {
      clearTimeout(this.footerTimeout);
    }

    this.showFooter = false;

    setTimeout(() => {

      this.showFooter = true;

      this.footerTimeout = setTimeout(() => {
        this.showFooter = false;
      }, 4000);

    }, 10);
  }

  /* =====================================================
     CLEANUP
  ===================================================== */
  ngOnDestroy(): void {

    this.destroy$.next();
    this.destroy$.complete();

    if (this.watermarkTimeout) clearTimeout(this.watermarkTimeout);
    if (this.footerTimeout) clearTimeout(this.footerTimeout);
    if (this.reminderTimeout) clearTimeout(this.reminderTimeout);
  }
}