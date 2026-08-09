import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal('');
  successMessage = signal('');

  registerForm = this.fb.group({
    first_name: ['', [Validators.required]],
    last_name: ['', [Validators.required]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  /**
   * SUBMIT USER REGISTRATION
   */
  onSubmit(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const formValue = this.registerForm.getRawValue();

    if (formValue.password !== formValue.confirmPassword) {
      this.errorMessage.set('Passwords do not match');
      return;
    }

    this.loading.set(true);

    const payload = {
      first_name: formValue.first_name!,
      last_name: formValue.last_name!,
      username: formValue.username!,
      email: formValue.email!,
      phone: formValue.phone!,
      password: formValue.password!,
    };

    this.authService.createUser(payload).subscribe({
      next: (response) => {
        this.loading.set(false);

        if (response.success) {
          this.successMessage.set(
            response.message || 'Registration successful'
          );

          this.registerForm.reset();

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1200);
        } else {
          this.errorMessage.set(
            response.message || 'Registration failed'
          );
        }
      },

      error: (err) => {
        this.loading.set(false);

        this.errorMessage.set(
          err?.error?.message || 'Something went wrong'
        );
      },
    });
  }

  /**
   * GETTERS
   */
  get first_name() {
    return this.registerForm.get('first_name');
  }

  get last_name() {
    return this.registerForm.get('last_name');
  }

  get username() {
    return this.registerForm.get('username');
  }

  get email() {
    return this.registerForm.get('email');
  }

  get phone() {
    return this.registerForm.get('phone');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }
}