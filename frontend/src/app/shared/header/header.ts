import {
  Component,
  EventEmitter,
  Output,
  OnInit,
  HostListener,
  ChangeDetectorRef,
  DestroyRef,
  effect,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AcademicState } from '../header/academic-state';
import { AcademicYear, Class } from '../header/services/academic-read';

import { ThemeService, Theme } from '../../core/services/theme';
import {
  SearchStateService,
  SearchFilters,
} from '../../core/services/search-state';

import { AuthService } from '../../core/services/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './header.html',
  styleUrls: ['./header.css'],
})
export class Header implements OnInit {

  private destroyRef = inject(DestroyRef);
  private authService = inject(AuthService);

  // ================= USER =================
  // These used to be hardcoded ('Guest' / 'User') and never touched
  // again. They're now kept in sync with AuthService.user() via the
  // effect() below, which is the same signal the auth guards read —
  // so whatever the guard resolved on navigation is what the header
  // will display, and it updates live if the session changes.
  username = 'Guest';
  userRole = 'User';

  private readonly syncUserEffect = effect(() => {
    const currentUser = this.authService.user();

    this.username = currentUser?.username ?? 'Guest';
    this.userRole = currentUser?.role ?? 'User';

    this.cdr.markForCheck();
  });


  // ================= STATE =================

  academicYears$!: Observable<AcademicYear[]>;
  classes$!: Observable<Class[]>;

  selectedAcademicYearId: number | null = null;


  // ================= THEME =================

  themeMenuOpen = false;

  get themes() {
    return this.themeService.themes;
  }

  get currentTheme(): Theme {
    return this.themeService.currentTheme;
  }


  // ================= SIDEBAR =================

  @Output() toggleSidebar = new EventEmitter<{
    open: boolean;
    pinned: boolean;
    role: string;
  }>();

  private sidebarPinned = false;


  constructor(
    private router: Router,
    private academicState: AcademicState,
    private themeService: ThemeService,
    private searchState: SearchStateService,
    private cdr: ChangeDetectorRef
  ) {}


  // ================= INIT =================

  ngOnInit(): void {

    this.academicYears$ =
      this.academicState.academicYears$;

    this.classes$ =
      this.academicState.classes$;

    this.loadAcademicYears();

    // If auth state hasn't been resolved yet this session (e.g. this
    // component renders before a guard ran, or on a hard refresh),
    // fetch it now so username/role populate instead of staying on
    // the 'Guest' / 'User' defaults. If it was already checked (the
    // normal case — a guard resolved it first), this is a no-op
    // thanks to AuthService's inFlight$ / cached signal.
    if (!this.authService.hasChecked()) {
      this.authService
        .fetchCurrentUser()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe();
    }
  }


  // ================= LOAD ALL ACADEMIC YEARS =================

  private loadAcademicYears(): void {

    this.academicState
      .loadAcademicYears()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: (res) => {

          const years = res.data ?? [];

          // default to the year flagged as current; fall back to the first one
          const defaultYear =
            years.find(y => y.isCurrentYear) ?? years[0] ?? null;

          if (defaultYear) {
            this.selectedAcademicYearId = defaultYear.academicYearId;
            this.loadAcademicYearFull(defaultYear.academicYearId);
          }

          this.cdr.markForCheck();
        },

        error: (err) => {
          console.error('Failed loading academic years:', err);
          this.cdr.markForCheck();
        }

      });

  }


  // ================= LOAD FULL YEAR DATA =================
  // Populates selectedAcademicYear + classes + books + uniforms in one call.

  private loadAcademicYearFull(academicYearId: number): void {

    this.academicState
      .loadAcademicYearFull(academicYearId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: () => {
          this.cdr.markForCheck();
        },

        error: (err) => {
          console.error('Failed loading academic year full data:', err);
          this.academicState.setClasses([]);
          this.cdr.markForCheck();
        }

      });

  }


  // ================= THEME =================

  toggleThemeMenu(): void {
    this.themeMenuOpen = !this.themeMenuOpen;
  }


  applyTheme(theme: Theme): void {
    this.themeService.apply(theme);
    this.themeMenuOpen = false;
  }


  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {

    const target = event.target as HTMLElement;

    if (!target.closest('.theme-switcher')) {
      this.themeMenuOpen = false;
    }

  }


  // ================= ACADEMIC YEAR CHANGE =================

  onAcademicYearChange(event: Event): void {

    const academicYearId =
      Number((event.target as HTMLSelectElement).value);

    this.selectedAcademicYearId = academicYearId || null;
    this.academicState.setClasses([]);

    if (!academicYearId) {
      return;
    }

    this.loadAcademicYearFull(academicYearId);
  }


  // ================= CLASS CHANGE =================

  onClassChange(event: Event): void {

    const classId =
      Number((event.target as HTMLSelectElement).value);

    if (!classId) {
      return;
    }

    console.log('Selected class:', classId);
  }


  // ================= SEARCH =================

  onSearch(form: NgForm): void {

    const raw = form.value;

    const filters: SearchFilters = {

      academicYearId:
        raw.academicYearId ? Number(raw.academicYearId) : undefined,

      classId:
        raw.classId ? Number(raw.classId) : undefined,

      section:
        raw.section || undefined,

      student_name:
        raw.student_name || undefined,

      parent_name:
        raw.parent_name || undefined,

    };

    const cleanedFilters =
      Object.fromEntries(
        Object.entries(filters)
          .filter(([_, value]) =>
            value !== undefined && value !== null && value !== ''
          )
      ) as SearchFilters;

    this.searchState.updateSearch(cleanedFilters);
  }


  // ================= SIDEBAR =================

  onRoleClick(): void {
    this.toggleSidebar.emit({
      open: true,
      pinned: this.sidebarPinned,
      role: this.userRole,
    });
  }


  onRoleDoubleClick(): void {
    this.sidebarPinned = !this.sidebarPinned;

    this.toggleSidebar.emit({
      open: true,
      pinned: this.sidebarPinned,
      role: this.userRole,
    });
  }


  // ================= NAVIGATION =================

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }


  // ================= AUTH =================
  // Previously just did console.log('Logout clicked') — it never
  // called the backend, never cleared the cached user signal, and
  // never navigated anywhere, so the old session stayed active.
  logout(): void {

    this.authService
      .logout()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({

        next: () => {
          // AuthService.logout() already calls clearCachedUser()
          // internally on success (via its own tap()), so username/
          // userRole will flip back to 'Guest'/'User' automatically
          // through the effect() above.
          this.router.navigate(['/login']);
        },

        error: (err) => {
          console.error('Logout failed:', err);

          // Even if the server call fails (e.g. network drop or the
          // session was already invalid server-side), clear local
          // state and send the user to login rather than leaving
          // them stuck on a page that thinks they're still signed in.
          this.authService.clearCachedUser();
          this.router.navigate(['/login']);
        }

      });
  }

}