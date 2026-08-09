// src/app/core/guest-guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './services/auth';

/**
 * Opposite of authGuard.
 * Keeps already-logged-in users OUT of the auth pages (login/register/etc.)
 * and bounces them to the dashboard instead. Guests (no valid session)
 * pass through normally.
 *
 * Usage in routes:
 * {
 *   path: '',
 *   component: AuthLayout,
 *   canActivate: [guestGuard],
 *   children: [ ...login, register, register-admin, reset-password ]
 * }
 */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const check = (loggedIn: boolean) => {
    if (loggedIn) return router.createUrlTree(['/dashboard']);
    return true;
  };

  // Session already verified earlier in this app lifetime — use the cached
  // result instead of re-checking with the backend on every navigation.
  if (authService.hasChecked()) {
    return check(authService.isLoggedIn());
  }

  // First check this session: ask the backend whether a valid session exists.
  return authService.fetchCurrentUser().pipe(
    map((user) => check(!!user)),
    // Safety net only — AuthService.fetchCurrentUser() already catches its
    // own errors internally and resolves to null, so this branch shouldn't
    // actually fire today. Kept here in case that internal behavior changes:
    // if the /me check itself throws, treat it as "not logged in" and allow
    // access to the auth pages rather than leaving the guard unresolved.
    catchError(() => of(true))
  );
};