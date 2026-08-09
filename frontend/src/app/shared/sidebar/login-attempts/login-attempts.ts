import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';

import {
  LoginAttemptsService,
  LoginAttempt,
} from '../../../shared/sidebar/services/login-attempts';

@Component({
  selector: 'app-login-attempts',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login-attempts.html',
  styleUrl: './login-attempts.css',
})
export class LoginAttemptsComponent implements OnInit {

  private readonly loginAttemptsService = inject(LoginAttemptsService);

  private readonly cdr = inject(ChangeDetectorRef);
  readonly loginAttempts = signal<LoginAttempt[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string>('');

  readonly limit = 20;
  offset = 0;

  readonly userId = '9a55bca7-5536-4c7b-a1e0-729f177f40ff';

  ngOnInit(): void {
    this.fetchLoginAttempts();
  }

  fetchLoginAttempts(): void {
    this.loading.set(true);
    this.error.set('');

    this.loginAttemptsService
      .getUserLoginAttempts(this.userId, this.limit, this.offset)
      .subscribe({
        next: (response) => {
          this.loading.set(false);

          if (response.success) {
            this.loginAttempts.set(response.data ?? []);
          } else {
            this.error.set(response.message ?? 'Failed to fetch login attempts');
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('❌ fetchLoginAttempts error:', err);
          this.loading.set(false);
          this.error.set('Server error while fetching login attempts');
          this.cdr.markForCheck();
        },
      });
  }

  loadMore(): void {
    this.offset += this.limit;

    this.loginAttemptsService
      .getUserLoginAttempts(this.userId, this.limit, this.offset)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.loginAttempts.update((current) => [
              ...current,
              ...(response.data ?? []),
            ]);
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('❌ loadMore error:', err);
          this.cdr.markForCheck();
        },
      });
  }

  refresh(): void {
    this.offset = 0;
    this.fetchLoginAttempts();
  }

  trackByAttemptId(index: number, attempt: LoginAttempt): string {
    return attempt.attempt_id;
  }
}