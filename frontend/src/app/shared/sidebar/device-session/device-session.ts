import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  DeviceSessionService,
  DeviceSession,
} from '../../../shared/sidebar/services/device-session';

import { UserService, User } from '../services/user';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-device-session',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './device-session.html',
  styleUrl: './device-session.css',
})
export class DeviceSessionComponent implements OnInit {
  /**
   * ======================================================
   * DEPENDENCIES
   * ======================================================
   */
  private readonly sessionService = inject(DeviceSessionService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  /**
   * ======================================================
   * SESSION STATE
   * ======================================================
   */
  sessions: DeviceSession[] = [];
  loading = false;
  error = '';

  /**
   * ======================================================
   * USER STATE
   * Same pattern as AuditLogs: fetch the full user list once.
   * getAllUsers() is already scoped server-side — a non-privileged
   * caller only ever gets back [self], so the dropdown never offers
   * an id the backend would reject anyway.
   * ======================================================
   */
  users: User[] = [];
  selectedUserId = '';
  selectedUser: User | null = null;
  usersLoading = false;
  usersError = '';

  /**
   * ======================================================
   * INITIAL LOAD
   * ======================================================
   */
  ngOnInit(): void {
    const currentUser = this.authService.user();

    if (currentUser) {
      this.selectedUserId = currentUser.user_id;
    }

    this.loadUsers();
  }

  /**
   * ======================================================
   * FETCH USERS
   * ======================================================
   */
  loadUsers(): void {
    this.usersLoading = true;
    this.usersError = '';

    this.userService.getAllUsers().subscribe({
      next: (response) => {
        this.users = response.data || [];

        if (this.selectedUserId) {
          this.selectedUser =
            this.users.find((user) => user.user_id === this.selectedUserId) ||
            null;

          this.loadSelectedUserSessions();
        }

        this.usersLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error(err);
        this.usersError = 'Failed to load users';
        this.usersLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * ======================================================
   * USER SELECT EVENT
   * ======================================================
   */
  onUserSelected(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.selectedUserId = selectElement.value;

    this.selectedUser =
      this.users.find((user) => user.user_id === this.selectedUserId) || null;

    if (this.selectedUserId) {
      this.loadSelectedUserSessions();
    } else {
      this.sessions = [];
      this.selectedUser = null;
    }
  }

  /**
   * ======================================================
   * LOAD SESSIONS
   * ======================================================
   */
  loadSelectedUserSessions(): void {
    if (!this.selectedUserId) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.sessionService
      .getSessions({ user_id: this.selectedUserId })
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.sessions = response.data || [];
          } else {
            // Covers both plain failures and the 403 case when a
            // non-privileged actor's own id somehow gets rejected.
            this.error = response.message || 'Failed to load sessions';
            this.sessions = [];
          }

          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error(err);
          this.error =
            err?.error?.message === 'Access denied'
              ? "You don't have permission to view this user's sessions"
              : 'Failed to load sessions';
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  /**
   * ======================================================
   * DELETE SESSION
   * ======================================================
   */
  deleteSession(session: DeviceSession): void {
    const confirmed = confirm(`Delete session for ${session.session_date}?`);
    if (!confirmed) return;

    this.sessionService
      .deleteSession({
        user_id: session.user_id,
        date: session.session_date,
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.sessions = this.sessions.filter(
              (s) => s.session_date !== session.session_date
            );
            this.cdr.markForCheck();
          } else {
            alert(res.message || 'Failed to delete');
          }
        },
        error: (err) => {
          console.error(err);
          alert(
            err?.error?.message === 'Access denied'
              ? "You don't have permission to delete this session"
              : 'Server error'
          );
        },
      });
  }

  /**
   * ======================================================
   * TRACK BY
   * DeviceSession rows are keyed by (user_id, session_date), not `id`.
   * ======================================================
   */
  trackBySessionKey(index: number, session: DeviceSession): string {
    return `${session.user_id}-${session.session_date}`;
  }
}