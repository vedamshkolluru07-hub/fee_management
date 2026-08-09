import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})
export class ResetPasswordComponent implements OnInit {
  // form fields
  identifier = '';
  method: 'otp' | 'token' = 'otp';
  otp = '';
  token = '';
  newPassword = '';
  confirmPassword = '';

  // UI state
  loading = false;
  message = '';
  error = '';
  success = false;

  constructor(private authService: AuthService,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef) {}

  /**
   * AUTO READ TOKEN FROM URL
   */
  ngOnInit(): void {
    const urlToken = this.route.snapshot.queryParamMap.get('token');

    if (urlToken) {
      this.method = 'token';
      this.token = urlToken;
    }
  }

  /**
   * SUBMIT RESET REQUEST
   */
  onSubmit() {
    this.message = '';
    this.error = '';
    this.success = false;

    if (!this.identifier || !this.newPassword) {
      this.error = 'Identifier and new password are required';
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    if (this.method === 'otp' && !this.otp) {
      this.error = 'OTP is required';
      return;
    }

    if (this.method === 'token' && !this.token) {
      this.error = 'Reset token is required';
      return;
    }

    this.loading = true;

    const payload: any = {
      identifier: this.identifier,
      method: this.method,
      newPassword: this.newPassword,
    };

    if (this.method === 'otp') {
      payload.otp = this.otp;
    } else {
      payload.token = this.token;
    }

    this.authService.resetPassword(payload).subscribe({
      next: (res) => {
        this.loading = false;

        if (res.success) {
          this.success = true;
          this.message = res.message || 'Password reset successful';

          // clear form
          this.identifier = '';
          this.otp = '';
          this.token = '';
          this.newPassword = '';
          this.confirmPassword = '';
        } else {
          this.error = res.message || 'Reset failed';
        }
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.error =
          err?.error?.message || 'Server error while resetting password';
        this.cdr.markForCheck();
      },
    });
  }

  /**
   * SWITCH METHOD
   */
  switchMethod(method: 'otp' | 'token') {
    this.method = method;
    this.otp = '';
    this.token = '';
    this.error = '';
    this.message = '';
  }
}