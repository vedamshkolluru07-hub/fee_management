// src/app/shared/sidebar/sidebar.ts

import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrls: ['./sidebar.css'],
})
export class Sidebar {

  @Input() isOpen = false;
  @Input() pinned = false;

  @Output() closeSidebar = new EventEmitter<void>();

  userRole: 'guest' | 'admin' | 'moderator' | 'user' = 'guest';

  menuItems = [
    { label: 'App Settings',     route: '/app-settings',     icon: 'fas fa-cog' },
    { label: 'Audit Logs',       route: '/audit-logs',        icon: 'fas fa-clipboard-list' },
    { label: 'Calendar',         route: '/calendar',          icon: 'fas fa-calendar-alt' },
    { label: 'Home Page Editor', route: '/home-editor',       icon: 'fas fa-house' },
    { label: 'About Page Editor',route: '/about-editor',      icon: 'fas fa-file-lines' },
    { label: 'Enquiries',        route: '/enquiries',         icon: 'fas fa-envelope-open-text' },
    { label: 'Connect & Theme',  route: '/connect-links',     icon: 'fas fa-share-nodes' },
    { label: 'Device Sessions',  route: '/device-session',   icon: 'fas fa-laptop' },
    { label: 'Login Attempts',   route: '/login-attempts',    icon: 'fas fa-shield-alt' },
    { label: 'Notifications',    route: '/notification',      icon: 'fas fa-bell' },
    { label: 'OTP Requests',     route: '/otp-request',       icon: 'fas fa-key' },
    { label: 'Password Reset',   route: '/password-reset',    icon: 'fas fa-lock' },
    { label: 'Token',            route: '/token',             icon: 'fas fa-ticket-alt' },
    { label: 'User Management',  route: '/user',              icon: 'fas fa-users' },
  ];

  // NOTE: previously this also did `this.isOpen = false`, mutating an
  // @Input directly. That's an Angular anti-pattern — the parent owns
  // isOpen via [isOpen]="isSidebarOpen" and will just overwrite this
  // local mutation on the next change-detection pass anyway. The sidebar
  // now only emits; main-layout.ts is the single source of truth for
  // open/closed state.
  closeIfNotPinned(): void {
    if (this.pinned) return;
    this.closeSidebar.emit();
  }
}