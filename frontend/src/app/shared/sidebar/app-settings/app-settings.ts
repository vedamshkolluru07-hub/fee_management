import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppSettingsService } from '../services/app-settings';

/* ======================================================
   🔹 RESPONSE TYPES (prevents "unknown" errors)
====================================================== */

interface LimitResponse {
  success: boolean;
  limit: number;
}

interface RestrictionResponse {
  success: boolean;
  restricted: boolean;
}

interface BaseResponse {
  success: boolean;
}

/* ======================================================
   🔹 COMPONENT
====================================================== */

@Component({
  selector: 'app-app-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app-settings.html',
  styleUrl: './app-settings.css',
})
export class AppSettingsComponent implements OnInit {
  private settingsService = inject(AppSettingsService);

  // ======================================================
  // UI STATE
  // ======================================================
  loading = signal(false);
  message = signal<string | null>(null);

  // ======================================================
  // FORM STATE
  // ======================================================
  userLimit = signal<number>(100);
  adminLimit = signal<number>(2);
  restrictUser = signal<boolean>(false);
  restrictAdmin = signal<boolean>(false);

  // ======================================================
  // INIT
  // ======================================================
  ngOnInit(): void {
    this.loadSettings();
  }

  // ======================================================
  // LOAD ALL SETTINGS
  // ======================================================
  loadSettings(): void {
    this.loading.set(true);

    this.settingsService.getUserLimit().subscribe({
      next: (res: LimitResponse) => {
        this.userLimit.set(res.limit);
      },
    });

    this.settingsService.getAdminLimit().subscribe({
      next: (res: LimitResponse) => {
        this.adminLimit.set(res.limit);
      },
    });

    this.settingsService.isUserRestricted().subscribe({
      next: (res: RestrictionResponse) => {
        this.restrictUser.set(res.restricted);
      },
    });

    this.settingsService.isAdminRestricted().subscribe({
      next: (res: RestrictionResponse) => {
        this.restrictAdmin.set(res.restricted);
        this.loading.set(false);
      },
    });
  }

  // ======================================================
  // UPDATE USER LIMIT
  // ======================================================
  updateUserLimit(): void {
    this.settingsService
      .updateSetting('user_limit', String(this.userLimit()))
      .subscribe({
        next: (_res: BaseResponse) => {
          this.showMessage('User limit updated');
        },
      });
  }

  // ======================================================
  // UPDATE ADMIN LIMIT
  // ======================================================
  updateAdminLimit(): void {
    this.settingsService
      .updateSetting('admin_limit', String(this.adminLimit()))
      .subscribe({
        next: (_res: BaseResponse) => {
          this.showMessage('Admin limit updated');
        },
      });
  }

  // ======================================================
  // TOGGLE USER RESTRICTION
  // ======================================================
  toggleUserRestriction(): void {
    this.settingsService
      .updateSetting(
        'restrict_user_creation',
        this.restrictUser() ? '1' : '0'
      )
      .subscribe({
        next: (_res: BaseResponse) => {
          this.showMessage('User restriction updated');
        },
      });
  }

  // ======================================================
  // TOGGLE ADMIN RESTRICTION
  // ======================================================
  toggleAdminRestriction(): void {
    this.settingsService
      .updateSetting(
        'restrict_admin_creation',
        this.restrictAdmin() ? '1' : '0'
      )
      .subscribe({
        next: (_res: BaseResponse) => {
          this.showMessage('Admin restriction updated');
        },
      });
  }

  // ======================================================
  // UI MESSAGE HANDLER
  // ======================================================
  private showMessage(msg: string): void {
    this.message.set(msg);

    setTimeout(() => {
      this.message.set(null);
    }, 3000);
  }
}