import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { TokenService } from '../../../shared/sidebar/services/token';

@Component({
  selector: 'app-token',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './token.html',
  styleUrl: './token.css',
})
export class Token {
  // ======================================================
  // 🔹 DEPENDENCY INJECTION
  // ======================================================
  private fb = inject(FormBuilder);
  private tokenService = inject(TokenService);

  // ======================================================
  // 🔹 UI STATE
  // ======================================================
  loading = signal(false);
  message = signal('');
  error = signal('');

  // ======================================================
  // 🔹 FORM
  // ======================================================
  tokenForm = this.fb.nonNullable.group({
    identifier: ['', Validators.required],
  });

  // ======================================================
  // 🔹 SEND RESET TOKEN
  // ======================================================
  sendToken(): void {
    this.message.set('');
    this.error.set('');

    if (this.tokenForm.invalid) {
      this.tokenForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);

    const payload = this.tokenForm.getRawValue();

    this.tokenService.sendPasswordResetToken(payload).subscribe({
      next: (res) => {
        this.loading.set(false);

        if (res.success) {
          this.message.set(res.message);

          this.tokenForm.reset({
            identifier: '',
          });

          return;
        }

        this.error.set(res.message);
      },

      error: (err) => {
        this.loading.set(false);

        this.error.set(
          err?.error?.message ||
            err?.message ||
            'Failed to send reset token'
        );
      },
    });
  }

  // ======================================================
  // 🔹 GETTERS
  // ======================================================
  get identifier() {
    return this.tokenForm.controls.identifier;
  }
}