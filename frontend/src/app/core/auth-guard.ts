// src/app/core/auth/auth.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './services/auth';

/**
 * Protects routes that require an authenticated user.
 * Redirects unauthenticated users to /login, preserving the
 * originally requested URL as ?returnUrl= so they land back
 * where they intended after logging in.
 *
 * Usage:
 * { path: 'dashboard', canActivate: [authGuard], ... }
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const redirectToLogin = () =>
    router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });

  // Session already verified earlier in this app lifetime — use the cached result,
  // no need to hit the backend again.
  if (authService.hasChecked()) {
    return authService.isLoggedIn() ? true : redirectToLogin();
  }

  // First check this session: ask the backend whether a valid session exists.
  return authService.fetchCurrentUser().pipe(
    map((user) => (user ? true : redirectToLogin())),
    catchError(() => {
      // Network/server error while checking — treat as "not logged in" and
      // send them to login rather than leaving the guard unresolved.
      authService.clearCachedUser();
      return of(redirectToLogin());
    })
  );
};