// ======================================================
// src/app/app.routes.ts
// ======================================================
import { Routes } from '@angular/router';
import { AuthLayout } from './layouts/auth-layout/auth-layout';
import { MainLayout } from './layouts/main-layout/main-layout';
import { PublicLayout } from './layouts/public-layout/public-layout';
import { authGuard } from './core/auth-guard';
import { roleGuard } from './core/role-guard';
import { canManageUsersGuard } from './core/permission-guard';
import { guestGuard } from './core/guest-guard';

export const routes: Routes = [
  // ======================================================
  // 🌐 PUBLIC WEBSITE (no login required)
  // ======================================================
  {
    path: '',
    component: PublicLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./features/public/home/home')
            .then(m => m.PublicHome),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./features/public/about/about')
            .then(m => m.PublicAbout),
      },
    ],
  },
  // ======================================================
  // 🔓 AUTHENTICATION AREA
  // ======================================================
  {
    path: '',
    component: AuthLayout,
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login')
            .then(m => m.Login),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register')
            .then(m => m.Register),
      },
      {
        path: 'register-admin',
        loadComponent: () =>
          import('./features/auth/register-admin/register-admin')
            .then(m => m.RegisterAdmin),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password')
            .then(m => m.ResetPasswordComponent),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },
  // ======================================================
  // 🔐 PROTECTED AREA
  // ======================================================
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      // ==================================================
      // DASHBOARD — any logged-in user
      // ==================================================
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard')
            .then(m => m.Dashboard),
      },
      // ==================================================
      // STUDENT MANAGEMENT
      // ==================================================
      {
        path: 'add-student', // any logged-in user
        loadComponent: () =>
          import('./features/dashboard/add-student/add-student')
            .then(m => m.AddStudent),
      },
      {
        path: 'view-student', // any logged-in user
        loadComponent: () =>
          import('./features/dashboard/view-student/view-student')
            .then(m => m.ViewStudent),
      },
      {
        path: 'update-student',
        canActivate: [canManageUsersGuard],
        loadComponent: () =>
          import('./features/dashboard/update-student/update-student')
            .then(m => m.UpdateStudent),
      },
      {
        path: 'bulk-student-upload',
        canActivate: [canManageUsersGuard],
        loadComponent: () =>
          import('./features/dashboard/bulk-student-upload/bulk-student-upload')
            .then(m => m.BulkStudentComponent),
      },
      {
        path: 'promote-student',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./features/dashboard/promote-student/promote-student')
            .then(m => m.PromoteStudent),
      },
      {
        path: 'student-model',
        canActivate: [canManageUsersGuard],
        loadComponent: () =>
          import('./features/dashboard/student-model/student-model')
            .then(m => m.StudentModel),
      },
      {
        path: 'payments',
        canActivate: [canManageUsersGuard],
        loadComponent: () =>
          import('./features/dashboard/payments/transactions/transactions')
            .then(m => m.Transactions),
      },
      {
        path: 'payments/view-books',
        canActivate: [canManageUsersGuard],
        loadComponent: () =>
          import('./features/dashboard/payments/view-books/view-books')
            .then(m => m.ViewBooksComponent),
      },
      {
        path: 'payments/view-tution',
        canActivate: [canManageUsersGuard],
        loadComponent: () =>
          import('./features/dashboard/payments/view-tution/view-tution')
            .then(m => m.ViewTution),
      },
      {
        path: 'payments/view-unifrom',
        canActivate: [canManageUsersGuard],
        loadComponent: () =>
          import('./features/dashboard/payments/view-unifrom/view-unifrom')
            .then(m => m.ViewUniformsComponent),
      },
      // ==================================================
      // ACADEMIC MANAGEMENT
      // ==================================================
      // --------------------------
      // Academic Years
      // --------------------------
      {
        path: 'academic-years-create',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./academic-management/academic-years-create/academic-years-create')
            .then(m => m.AcademicYearsCreate),
      },
      {
        path: 'academic-years-view',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./academic-management/academic-years-view/academic-years-view')
            .then(m => m.AcademicYearsView),
      },
      // --------------------------
      // Classes
      // --------------------------
      {
        path: 'class-create',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./academic-management/class-create/class-create')
            .then(m => m.ClassCreate),
      },
      {
        path: 'class-view', // any logged-in user
        loadComponent: () =>
          import('./academic-management/class-view/class-view')
            .then(m => m.ClassView),
      },
      // --------------------------
      // Books
      // --------------------------
      {
        path: 'books-create',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./academic-management/books-create/books-create')
            .then(m => m.BooksCreate),
      },
      {
        path: 'books-view', // any logged-in user
        loadComponent: () =>
          import('./academic-management/books-view/books-view')
            .then(m => m.BooksView),
      },
      // --------------------------
      // Uniforms
      // --------------------------
      {
        path: 'uniform-create',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./academic-management/uniform-create/uniform-create')
            .then(m => m.UniformCreate),
      },
      {
        path: 'uniform-view', // any logged-in user
        loadComponent: () =>
          import('./academic-management/uniform-view/uniform-view')
            .then(m => m.UniformView),
      },
      
      // ==================================================
      // SIDEBAR FEATURES
      // ==================================================
      {
        path: 'app-settings',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./shared/sidebar/app-settings/app-settings')
            .then(m => m.AppSettingsComponent),
      },
      // --------------------------
      // 🌐 WEBSITE MANAGEMENT (CMS) — admin/moderator only
      // --------------------------
      {
        path: 'home-editor',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./shared/sidebar/home-editor/home-editor')
            .then(m => m.HomeEditorComponent),
      },
      {
        path: 'about-editor',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./shared/sidebar/about-editor/about-editor')
            .then(m => m.AboutEditorComponent),
      },
      {
        path: 'enquiries',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./shared/sidebar/enquiries/enquiries')
            .then(m => m.EnquiriesComponent),
      },
      {
        path: 'connect-links',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./shared/sidebar/connect-links/connect-links')
            .then(m => m.ConnectLinksComponent),
      },
      {
        path: 'audit-logs', // any logged-in user
        loadComponent: () =>
          import('./shared/sidebar/audit-logs/audit-logs')
            .then(m => m.AuditLogs),
      },
      {
        path: 'calendar', // any logged-in user
        loadComponent: () =>
          import('./shared/sidebar/calendar/calendar')
            .then(m => m.CalendarComponent),
      },
      {
        path: 'device-session',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./shared/sidebar/device-session/device-session')
            .then(m => m.DeviceSessionComponent),
      },
      {
        path: 'login-attempts',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./shared/sidebar/login-attempts/login-attempts')
            .then(m => m.LoginAttemptsComponent),
      },
      {
        path: 'notification', // any logged-in user
        loadComponent: () =>
          import('./shared/sidebar/notification/notification')
            .then(m => m.Notification),
      },
      {
        path: 'otp-request',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./shared/sidebar/otp-request/otp-request')
            .then(m => m.OtpRequest),
      },
      {
        path: 'password-reset',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./shared/sidebar/password-reset/password-reset')
            .then(m => m.PasswordReset),
      },
      {
        path: 'token',
        canActivate: [roleGuard(['admin', 'moderator'])],
        loadComponent: () =>
          import('./shared/sidebar/token/token')
            .then(m => m.Token),
      },
      // --------------------------
      // 🔒 USER MANAGEMENT — requires can_manage_users
      // (mirrors backend requireUserManagement on userRoutes.js)
      // --------------------------
      {
        path: 'user',
        canActivate: [canManageUsersGuard],
        loadComponent: () =>
          import('./shared/sidebar/user/user')
            .then(m => m.UserComponent),
      },
      // ==================================================
      // DEFAULT PROTECTED ROUTE
      // ==================================================
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
    ],
  },
  // ======================================================
  // GLOBAL FALLBACK
  // ======================================================
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];