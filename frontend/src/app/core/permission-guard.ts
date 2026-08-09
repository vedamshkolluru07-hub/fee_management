// src/app/core/auth/permission.guard.ts

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { AuthService } from '../core/services/auth';

/**
 * Usage in routes:
 * {
 *   path: 'user-management',
 *   canActivate: [authGuard, canManageUsersGuard],
 *   ...
 * }
 * Mirrors backend roleMiddleware.js -> requireUserManagement.
 * Always pair with authGuard first.
 */
export const canManageUsersGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const checkPermission = (canManage: boolean) => {
    if (canManage) return true;
    return router.createUrlTree(['/forbidden']);
  };

  if (authService.hasChecked()) {
    return checkPermission(authService.canManageUsers());
  }

  return authService.fetchCurrentUser().pipe(
    map((user) => checkPermission(user?.can_manage_users ?? false)),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};