import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  AuditLogsService,
  AuditLog,
} from '../services/audit-logs';

import {
  UserService,
  User,
} from '../services/user';

import {
  AuthService,
} from '../../../core/services/auth';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './audit-logs.html',
  styleUrl: './audit-logs.css',
})
export class AuditLogs implements OnInit {

  /**
   * ======================================================
   * DEPENDENCIES
   * ======================================================
   */
  private readonly auditLogsService = inject(AuditLogsService);

  private readonly userService = inject(UserService);

  private readonly authService = inject(AuthService);

  private readonly cdr = inject(ChangeDetectorRef);

  /**
   * ======================================================
   * AUDIT LOG STATE
   * ======================================================
   */
  auditLogs: AuditLog[] = [];

  loading = false;

  error = '';

  /**
   * ======================================================
   * USER STATE
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

    this.userService
      .getAllUsers()
      .subscribe({

        next: (response) => {

          this.users = response.data || [];

          if (this.selectedUserId) {

            this.selectedUser =
              this.users.find(
                user => user.user_id === this.selectedUserId
              ) || null;

            this.loadSelectedUserAuditLogs();

          }

          this.usersLoading = false;

          this.cdr.markForCheck();

        },

        error: (err) => {

          console.error(err);

          this.usersError = 'Failed to load users';

          this.usersLoading = false;

          this.cdr.markForCheck();

        }

      });

  }

  /**
   * ======================================================
   * USER SELECT EVENT
   * ======================================================
   */
  onUserSelected(event: Event): void {

    const selectElement =
      event.target as HTMLSelectElement;

    this.selectedUserId =
      selectElement.value;

    this.selectedUser =
      this.users.find(
        user => user.user_id === this.selectedUserId
      ) || null;

    if (this.selectedUserId) {

      this.loadSelectedUserAuditLogs();

    } else {

      this.auditLogs = [];

      this.selectedUser = null;

    }

  }

  /**
   * ======================================================
   * LOAD AUDIT LOGS
   * ======================================================
   */
  loadSelectedUserAuditLogs(): void {

    if (!this.selectedUserId) {
      return;
    }

    this.loading = true;
    this.error = '';

    this.auditLogsService
      .getAuditLogs({
        actor_user_id: this.selectedUserId,
      })
      .subscribe({

        next: (response) => {

          this.auditLogs = response.data || [];

          this.loading = false;

          this.cdr.markForCheck();

        },

        error: (err) => {

          console.error(err);

          this.error = 'Failed to load audit logs';

          this.loading = false;

          this.cdr.markForCheck();

        },

      });

  }

  /**
   * ======================================================
   * TRACK BY
   * ======================================================
   */
  trackByLogId(
    index: number,
    log: AuditLog
  ): string {

    return log.log_id;

  }

  /**
   * ======================================================
   * FUTURE FEATURES
   * ======================================================
   */

  // searchUsers(value: string) {}

  // filterBySeverity(severity: string) {}

  // filterByCategory(category: string) {}

  // pagination() {}

  // exportLogs() {}

}

