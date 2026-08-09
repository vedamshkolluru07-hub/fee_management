import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  PasswordResetService,
  PasswordResetRequest,
} from '../../../shared/sidebar/services/password-reset';

@Component({
  selector: 'app-password-reset',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './password-reset.html',
  styleUrl: './password-reset.css',
})
export class PasswordReset {
  private readonly fb = inject(FormBuilder);
  private readonly passwordResetService = inject(PasswordResetService);

  /**
   * ======================================================
   * 🔹 UI STATE (Angular 21 Signals)
   * ======================================================
   */
  readonly loading = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');

  /**
   * ======================================================
   * 🔹 FORM
   * ======================================================
   */
  readonly resetForm = this.fb.nonNullable.group({
    identifier: ['', [Validators.required]],

    method: this.fb.nonNullable.control<'otp' | 'token'>('otp'),

    otp: [''],

    token: [''],

    newPassword: [
      '',
      [
        Validators.required,
        Validators.minLength(6),
      ],
    ],
  });

  /**
   * ======================================================
   * 🔹 SUBMIT
   * ======================================================
   */
  onSubmit(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    const formValue = this.resetForm.getRawValue();

    // Dynamic validation
    if (formValue.method === 'otp' && !formValue.otp) {
      this.errorMessage.set('OTP is required');
      return;
    }

    if (formValue.method === 'token' && !formValue.token) {
      this.errorMessage.set('Reset token is required');
      return;
    }

    const payload: PasswordResetRequest = {
      identifier: formValue.identifier,
      method: formValue.method,
      otp: formValue.otp || undefined,
      token: formValue.token || undefined,
      newPassword: formValue.newPassword,
    };

    this.loading.set(true);

    this.passwordResetService.resetPassword(payload).subscribe({
      next: (response) => {
        this.loading.set(false);

        if (response.success) {
          this.successMessage.set(response.message);
          this.resetForm.reset({
            identifier: '',
            method: 'otp',
            otp: '',
            token: '',
            newPassword: '',
          });
        } else {
          this.errorMessage.set(response.message);
        }
      },

      error: (error) => {
        this.loading.set(false);

        this.errorMessage.set(
          error?.error?.message || 'Password reset failed'
        );
      },
    });
  }

  /**
   * ======================================================
   * 🔹 HELPERS
   * ======================================================
   */
  isInvalid(field: string): boolean {
    const control = this.resetForm.get(field);

    return !!(
      control &&
      control.invalid &&
      (control.dirty || control.touched)
    );
  }
}