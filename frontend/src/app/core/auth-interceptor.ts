// src/app/core/auth/auth.interceptor.ts

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './services/auth';

let isRedirecting = false;

// Endpoints where a 401 is an EXPECTED possible outcome (login attempt failed,
// session-check found no session, etc.) — never treat these as "session died".
const SILENT_401_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/logout', '/auth/me'];

// Public routes a guest is allowed to be browsing. If a stray 401 happens while
// the user is on one of these, don't yank them to /login — they were never
// required to be authenticated here in the first place.
const PUBLIC_ROUTE_PREFIXES = ['/', '/about', '/login', '/register', '/register-admin', '/reset-password'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  const isAbsoluteUrl = req.url.startsWith('http');

  const apiReq = req.clone({
    url: isAbsoluteUrl
      ? req.url
      : `${environment.apiUrl}${req.url.startsWith('/') ? '' : '/'}${req.url}`,
    withCredentials: true,
  });

  return next(apiReq).pipe(
    catchError((err) => {
      const isSilent401Endpoint = SILENT_401_ENDPOINTS.some((endpoint) =>
        apiReq.url.includes(endpoint)
      );

      const currentUrlIsPublic = PUBLIC_ROUTE_PREFIXES.some((prefix) =>
        prefix === '/' ? router.url === '/' : router.url.startsWith(prefix)
      );

      // Only force a redirect when ALL of the following are true:
      // 1. It's genuinely an auth failure (401)
      // 2. It didn't come from an endpoint where 401 is an expected, normal outcome
      // 3. We're not already in the middle of redirecting (re-entrancy guard)
      // 4. The user is currently somewhere that actually requires authentication
      if (
        err.status === 401 &&
        !isSilent401Endpoint &&
        !isRedirecting &&
        !currentUrlIsPublic
      ) {
        isRedirecting = true;

        // Clear frontend session cache
        authService.clearCachedUser();

        router
          .navigate(['/login'], { queryParams: { returnUrl: router.url } })
          .finally(() => {
            isRedirecting = false;
          });
      }

      return throwError(() => err);
    })
  );
};