// src/app/core/auth/role.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from './services/auth';

/**
 * Usage:
 *
 * {
 *   path: 'admin',
 *   canActivate: [
 *     authGuard,
 *     roleGuard(['admin'])
 *   ]
 * }
 *
 * Checks:
 * - User must be authenticated
 * - User role must match allowed roles
 *
 * Authentication should always run before this guard.
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    const checkRole = (user: {
      role: string;
      is_approved: boolean;
    } | null) => {

      // No authenticated user
      if (!user) {
        return router.createUrlTree(['/login'], {
          queryParams: {
            returnUrl: state.url,
          },
        });
      }

      // Account not approved
      if (!user.is_approved) {
        return router.createUrlTree(['/forbidden']);
      }

      // Role validation
      if (allowedRoles.includes(user.role)) {
        return true;
      }

      // Authenticated but insufficient role
      return router.createUrlTree(['/forbidden']);
    };


    // User already loaded
    if (authService.hasChecked()) {
      return checkRole(authService.user());
    }


    // First time: fetch session from backend
    return authService.fetchCurrentUser().pipe(
      map((user) => checkRole(user)),
      catchError(() => {
        authService.clearCachedUser();

        return of(
          router.createUrlTree(['/login'], {
            queryParams: {
              returnUrl: state.url,
            },
          })
        );
      })
    );
  };
};
