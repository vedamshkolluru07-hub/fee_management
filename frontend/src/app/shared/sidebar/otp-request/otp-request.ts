import {
  Component,
  inject,
  signal,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  OtpRequestService,
  SendOtpRequest,
} from '../../../shared/sidebar/services/otp-request';

@Component({
  selector: 'app-otp-request',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './otp-request.html',
  styleUrl: './otp-request.css',
})
export class OtpRequest {
  // ======================================================
  // 🔹 DEPENDENCIES
  // ======================================================
  private fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private otpService = inject(OtpRequestService);

  // ======================================================
  // 🔹 UI STATE
  // ======================================================
  loading = signal<boolean>(false);
  message = signal<string>('');
  error = signal<string>('');

  // ======================================================
  // 🔹 FORM
  // ======================================================
  otpForm = this.fb.nonNullable.group({
    identifier: ['', Validators.required],

    method: this.fb.nonNullable.control<'sms' | 'email'>(
      'sms',
      Validators.required
    ),
  });

  // ======================================================
  // 🔹 SEND OTP
  // ======================================================
  sendOtp(): void {
    // Clear messages
    this.message.set('');
    this.error.set('');

    // Validate form
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    // Loading start
    this.loading.set(true);

    // Typed payload
    const payload: SendOtpRequest = {
      identifier: this.otpForm.controls.identifier.getRawValue(),
      method: this.otpForm.controls.method.getRawValue(),
    };

    // API CALL
    this.otpService.sendOtp(payload).subscribe({
      next: (response) => {
        this.loading.set(false);

        if (response.success) {
          this.message.set(response.message);

          // Reset form
          this.otpForm.reset({
            identifier: '',
            method: 'sms',
          });

          return;
        }

        this.error.set(response.message);
        this.cdr.markForCheck();
      },

      error: (err) => {
        this.loading.set(false);

        this.error.set(
          err?.error?.message ||
            err?.message ||
            'Failed to send OTP'
        );
        this.cdr.markForCheck();
      },
    });
  }

  // ======================================================
  // 🔹 GETTERS
  // ======================================================
  get identifier() {
    return this.otpForm.controls.identifier;
  }

  get method() {
    return this.otpForm.controls.method;
  }
}