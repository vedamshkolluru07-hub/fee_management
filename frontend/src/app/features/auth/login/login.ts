import {
  Component,
  OnInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  loading = false;
  errorMessage = '';

  loginForm!: FormGroup;

  constructor(private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      identifier: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const payload = {
      ...this.loginForm.value,
      device_info: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      },
    };

    this.authService.login(payload).subscribe({
      next: (res: any) => {
        this.loading = false;

        if (res.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = res.message || 'Login failed';
        }
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage =
          err?.error?.message || 'Server error. Try again later.';
        this.cdr.markForCheck();
      },
    });
  }

  get f() {
    return this.loginForm.controls;
  }
}