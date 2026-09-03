import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Subject, takeUntil } from 'rxjs';

import { CalendarApiService } from '../services/calander';
import { SocketService, CalendarReminder } from '../services/socket';
import { AcademicState } from '../../header/academic-state';
import { AcademicYear } from '../../header/services/academic-read';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class CalendarComponent implements OnInit, OnDestroy {

  // ======================================================
  // CLEANUP
  // ======================================================
  private destroy$ = new Subject<void>();

  // ======================================================
  // VIEW MODE
  // ======================================================
  viewMode: 'month' | 'week' | 'day' | 'year' | 'backend' = 'month';

  // ======================================================
  // THEME
  // ======================================================
  darkMode = false;

  toggleDarkMode(): void {
    this.darkMode = !this.darkMode;
  }

  // ======================================================
  // DATE STATE
  // ======================================================
  currentDate = new Date();
  selectedDate = new Date();

  selectedYear = this.currentDate.getFullYear();
  selectedMonth = this.currentDate.getMonth();
  selectedDay = this.currentDate.getDate();

  // Selected academic_year_id (the real FK value sent to the backend,
  // NOT a calendar year number)
  selectedAcademicYear: number | null = null;

  // ======================================================
  // STATIC DATA
  // ======================================================
  months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  weekdays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // Real academic year records loaded from the backend
  // ({ academicYearId, yearLabel, startDate, endDate, isCurrentYear, ... })
  academicYears: AcademicYear[] = [];

  // ======================================================
  // CALENDAR DATA
  // ======================================================
  calendarDays: any[] = [];
  weekDays: any[] = [];

  events: any[] = [];
  selectedDayEvents: any[] = [];

  upcomingEvents: any[] = [];
  alerts: any[] = [];
  recentCompleted: any = null;

  // ======================================================
  // UI STATE
  // ======================================================
  loading = false;
  panelsLoading = false;

  showReminderDialog = false;
  activeReminder: CalendarReminder | null = null;

  // Day-view multi-select (for deleteBulk)
  selectMode = false;
  selectedEventIds = new Set<number>();

  // Event create / edit modal
  showEventModal = false;
  modalMode: 'create' | 'edit' = 'create';
  editingEventId: number | null = null;
  eventForm: { title: string; description: string; start_time: string; end_time: string; academic_year_id: number | null } = {
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    academic_year_id: null
  };
  savingEvent = false;

  // Event detail modal (getEventById)
  showDetailModal = false;
  viewingEvent: any = null;
  detailLoading = false;

  // Postpone modal
  showPostponeModal = false;
  postponeTarget: any = null;
  postponeForm: { new_start_time: string; reason: string } = { new_start_time: '', reason: '' };
  postponing = false;

  // Postponement history modal
  showHistoryModal = false;
  postponementHistory: any[] = [];
  historyLoading = false;

  // ======================================================
  // CONSTRUCTOR
  // ======================================================
  constructor(private calendarApi: CalendarApiService,
    private socketService: SocketService,
    private academicState: AcademicState,
    private router: Router,
    private cdr: ChangeDetectorRef) {}

  // ======================================================
  // INIT
  // ======================================================
  ngOnInit(): void {

    const now = new Date();

    this.currentDate = now;
    this.selectedDate = now;

    this.selectedYear = now.getFullYear();
    this.selectedMonth = now.getMonth();
    this.selectedDay = now.getDate();

    this.initAcademicYears();
    this.socketSubscribe();

    this.loadMonthEvents();
    this.loadBackendPanels();
  }

  // ======================================================
  // SOCKET SUBSCRIPTION (FIXED - NO LEAK)
  // ======================================================
  socketSubscribe(): void {

    this.socketService.reminder$
      .pipe(takeUntil(this.destroy$))
      .subscribe((reminder) => {

        if (!reminder) return;

        this.activeReminder = reminder;
        this.showReminderDialog = true;
      });
  }

  // ======================================================
  // ACADEMIC YEARS (real records from academic_management)
  // ======================================================
  initAcademicYears(): void {

    // Use cached snapshot if AcademicState already has data (e.g. loaded by header)
    const cached = this.academicState.academicYearsSnapshot;

    if (cached.length) {
      this.applyAcademicYears(cached);
    }

    this.academicState.loadAcademicYears()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.applyAcademicYears(this.academicState.academicYearsSnapshot),
        error: () => {}
      });
  }

  private applyAcademicYears(years: AcademicYear[]): void {
    this.academicYears = years;

    if (!this.selectedAcademicYear && years.length) {
      const current = years.find(y => y.isCurrentYear) || years[0];
      this.selectedAcademicYear = current.academicYearId;
    }
  }

  // ======================================================
  // VIEW TITLE
  // ======================================================
  get currentViewTitle(): string {
    return `${this.months[this.selectedMonth]} ${this.selectedYear}`;
  }

  // ======================================================
  // ACADEMIC YEAR CHANGE (dropdown emits the real academic_year_id)
  // ======================================================
  onAcademicYearChange(academicYearId: number | string): void {
    this.selectedAcademicYear = Number(academicYearId);

    const match = this.academicYears.find(y => y.academicYearId === this.selectedAcademicYear);
    if (match?.startDate) {
      this.selectedYear = new Date(match.startDate).getFullYear();
    }

    this.refreshCalendar();
  }

  // ======================================================
  // MONTH CHANGE
  // ======================================================
  onMonthChange(month: number | string): void {
    this.selectedMonth = Number(month);
    this.refreshCalendar();
  }

  // ======================================================
  // VIEW MODE
  // ======================================================
  setView(mode: 'month'|'week'|'day'|'year'|'backend'): void {

    this.viewMode = mode;
    this.selectMode = false;
    this.selectedEventIds.clear();

    if (mode === 'week') this.generateWeekView();
    if (mode === 'day') this.updateSelectedDayEvents();
  }

  // ======================================================
  // TODAY
  // ======================================================
  goToToday(): void {

    const today = new Date();

    this.selectedDate = today;

    this.selectedYear = today.getFullYear();
    this.selectedMonth = today.getMonth();
    this.selectedDay = today.getDate();

    this.refreshCalendar();
  }

  // ======================================================
  // NAVIGATION
  // ======================================================
  goToPrevious(): void {

    if (this.viewMode === 'year') {
      this.selectedYear--;
      return this.refreshCalendar();
    }

    this.changeMonth(-1);
  }

  goToNext(): void {

    if (this.viewMode === 'year') {
      this.selectedYear++;
      return this.refreshCalendar();
    }

    this.changeMonth(1);
  }

  private changeMonth(step: number): void {

    const date = new Date(this.selectedYear, this.selectedMonth + step, 1);

    this.selectedYear = date.getFullYear();
    this.selectedMonth = date.getMonth();

    this.refreshCalendar();
  }

  // ======================================================
  // REFRESH
  // ======================================================
  refreshCalendar(): void {
    this.generateCalendar();
    this.loadMonthEvents();
    this.generateWeekView();
    this.updateSelectedDayEvents();
  }

  // ======================================================
  // LOAD EVENTS
  // ======================================================
  loadMonthEvents(): void {

    this.loading = true;

    const fromDate = new Date(this.selectedYear, this.selectedMonth, 1);
    const toDate = new Date(this.selectedYear, this.selectedMonth + 1, 0, 23, 59, 59);

    this.calendarApi.getEvents({
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (res: any) => {
        this.events = res?.data || [];
        this.refreshCalendarGridOnly();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.events = [];
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  // Rebuild grid/lists from already-loaded events without re-triggering an API call
  private refreshCalendarGridOnly(): void {
    this.generateCalendar();
    this.generateWeekView();
    this.updateSelectedDayEvents();
  }

  // ======================================================
  // CALENDAR GRID
  // ======================================================
  generateCalendar(): void {

    this.calendarDays = [];

    const firstDay = new Date(this.selectedYear, this.selectedMonth, 1);
    const lastDay = new Date(this.selectedYear, this.selectedMonth + 1, 0);

    const startDay = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const prevMonthDays = new Date(this.selectedYear, this.selectedMonth, 0).getDate();

    // prev month
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthDays - i;

      const date = new Date(this.selectedYear, this.selectedMonth - 1, day);

      this.calendarDays.push(this.buildDay(date, day, false));
    }

    // current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(this.selectedYear, this.selectedMonth, d);

      const dayEvents = this.getEventsForDate(date);

      this.calendarDays.push({
        ...this.buildDay(date, d, true),
        events: dayEvents
      });
    }

    // next month fill
    while (this.calendarDays.length < 42) {
      const nextIndex = this.calendarDays.length - (startDay + daysInMonth) + 1;
      const date = new Date(this.selectedYear, this.selectedMonth + 1, nextIndex);

      this.calendarDays.push(this.buildDay(date, nextIndex, false));
    }
  }

  private buildDay(date: Date, day: number, currentMonth: boolean) {
    return {
      date,
      dayNumber: day,
      currentMonth,
      isToday: this.isToday(date),
      isSelected: this.isSameDate(date, this.selectedDate),
      events: []
    };
  }

  // ======================================================
  // WEEK VIEW
  // ======================================================
  generateWeekView(): void {

    this.weekDays = [];

    const start = new Date(this.selectedDate);
    start.setDate(start.getDate() - start.getDay());

    for (let i = 0; i < 7; i++) {

      const date = new Date(start);
      date.setDate(start.getDate() + i);

      this.weekDays.push({
        name: this.weekdays[i],
        date,
        isToday: this.isToday(date),
        events: this.getEventsForDate(date)
      });
    }
  }

  // ======================================================
  // DAY SELECT
  // ======================================================
  onDaySelect(date: Date): void {

    this.selectedDate = new Date(date);

    this.selectedYear = date.getFullYear();
    this.selectedMonth = date.getMonth();
    this.selectedDay = date.getDate();

    this.updateSelectedDayEvents();
    this.generateCalendar();

    this.viewMode = 'day';
  }

  updateSelectedDayEvents(): void {
    this.selectedDayEvents = this.getEventsForDate(this.selectedDate);
  }

  // ======================================================
  // HELPERS
  // ======================================================
  private getEventsForDate(date: Date): any[] {
    return this.events.filter(e =>
      this.isSameDate(new Date(e.start_time), date)
    );
  }

  isSameDate(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  isToday(date: Date): boolean {
    const t = new Date();
    return this.isSameDate(date, t);
  }

  // ======================================================
  // BACKEND PANELS
  // ======================================================
  loadBackendPanels(): void {

    this.panelsLoading = true;

    this.calendarApi.getUpcoming15Days()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => this.upcomingEvents = res?.data || []);

    this.calendarApi.getLoginAlerts()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => this.alerts = res?.data || []);

    this.calendarApi.getRecentCompleted()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.recentCompleted = res?.data || null;
          this.panelsLoading = false;
        },
        error: () => this.panelsLoading = false
      });
  }

  // ======================================================
  // CLEANUP OLD POSTPONEMENTS (postponementService)
  // ======================================================
  cleanupOldPostponements(): void {

    if (!confirm('Remove postponement records older than 30 days?')) return;

    this.calendarApi.cleanupPostponements(30)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadBackendPanels());
  }

  // ======================================================
  // POSTPONE
  // ======================================================
  openPostponeModal(event: any, mouseEvent?: Event): void {
    if (mouseEvent) mouseEvent.stopPropagation();

    this.postponeTarget = event;
    this.postponeForm = { new_start_time: '', reason: '' };
    this.showPostponeModal = true;
  }

  closePostponeModal(): void {
    this.showPostponeModal = false;
    this.postponeTarget = null;
  }

  submitPostpone(): void {
    if (!this.postponeTarget || !this.postponeForm.new_start_time) return;

    this.postponing = true;

    const isoTime = new Date(this.postponeForm.new_start_time).toISOString();

    this.calendarApi.postponeEvent(
      this.postponeTarget.event_id,
      isoTime,
      this.postponeForm.reason || 'Postponed from calendar UI'
    )
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: () => {
        this.postponing = false;
        this.closePostponeModal();
        this.loadMonthEvents();
        this.loadBackendPanels();
      },
      error: () => this.postponing = false
    });
  }

  // ======================================================
  // POSTPONEMENT HISTORY
  // ======================================================
  viewPostponementHistory(eventId: number, mouseEvent?: Event): void {
    if (mouseEvent) mouseEvent.stopPropagation();

    this.historyLoading = true;
    this.showHistoryModal = true;

    this.calendarApi.getPostponementHistory(eventId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.postponementHistory = res?.data || [];
          this.historyLoading = false;
        },
        error: () => {
          this.postponementHistory = [];
          this.historyLoading = false;
        }
      });
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.postponementHistory = [];
  }

  // ======================================================
  // REMINDER UI
  // ======================================================
  closeReminderDialog(): void {
    this.showReminderDialog = false;
    this.activeReminder = null;
  }

  openEventFromReminder(): void {

    if (!this.activeReminder) return;

    this.router.navigate(['/calendar']);

    this.showReminderDialog = false;
  }

  // ======================================================
  // TRACK BY FUNCTIONS (FIX NG ERRORS)
  // ======================================================
  trackByYear(index: number, item: AcademicYear): number {
    return item.academicYearId;
  }

  trackByDate(index: number, item: any): string {
    return item?.date ? new Date(item.date).toISOString() : index.toString();
  }

  trackByEventId(index: number, item: any): number {
    return item?.event_id ?? index;
  }

  // ======================================================
  // EVENT DETAIL (getEventById)
  // ======================================================
  openEvent(event: any, mouseEvent?: Event): void {
    if (mouseEvent) mouseEvent.stopPropagation();

    this.detailLoading = true;
    this.showDetailModal = true;
    this.viewingEvent = null;

    this.calendarApi.getEventById(event.event_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.viewingEvent = res?.data || event;
          this.detailLoading = false;
        },
        error: () => {
          this.viewingEvent = event;
          this.detailLoading = false;
        }
      });
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.viewingEvent = null;
  }

  // ======================================================
  // CREATE / EDIT EVENT (createEvent / updateEvent)
  // ======================================================
  createNewEvent(): void {
    this.modalMode = 'create';
    this.editingEventId = null;
    this.eventForm = {
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      academic_year_id: this.selectedAcademicYear
    };
    this.showEventModal = true;
  }

  editEvent(event: any, mouseEvent?: Event): void {
    if (mouseEvent) mouseEvent.stopPropagation();

    this.modalMode = 'edit';
    this.editingEventId = event.event_id;
    this.eventForm = {
      title: event.title || '',
      description: event.description || '',
      start_time: event.start_time ? this.toDateTimeLocal(event.start_time) : '',
      end_time: event.end_time ? this.toDateTimeLocal(event.end_time) : '',
      academic_year_id: event.academic_year_id ?? this.selectedAcademicYear
    };
    this.showEventModal = true;
  }

  private toDateTimeLocal(value: string): string {
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  closeEventModal(): void {
    this.showEventModal = false;
    this.editingEventId = null;
  }

  submitEventForm(): void {
    if (!this.eventForm.title || !this.eventForm.start_time || !this.eventForm.academic_year_id) return;

    this.savingEvent = true;

    const payload = {
      title: this.eventForm.title,
      description: this.eventForm.description,
      start_time: new Date(this.eventForm.start_time).toISOString(),
      end_time: this.eventForm.end_time ? new Date(this.eventForm.end_time).toISOString() : undefined,
      academic_year_id: this.eventForm.academic_year_id
    };

    const request$ = this.modalMode === 'edit' && this.editingEventId
      ? this.calendarApi.updateEvent(this.editingEventId, payload)
      : this.calendarApi.createEvent(payload);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.savingEvent = false;
          this.closeEventModal();
          this.loadMonthEvents();
          this.loadBackendPanels();
        },
        error: () => this.savingEvent = false
      });
  }

  // ======================================================
  // DELETE (deleteEvent / deleteBulk)
  // ======================================================
  deleteEvent(eventId: number, mouseEvent?: Event): void {
    if (mouseEvent) mouseEvent.stopPropagation();

    if (!confirm('Delete this event? This cannot be undone.')) return;

    this.calendarApi.deleteEvent(eventId)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadMonthEvents();
        this.loadBackendPanels();
      });
  }

  toggleSelectMode(): void {
    this.selectMode = !this.selectMode;
    this.selectedEventIds.clear();
  }

  toggleEventSelected(eventId: number): void {
    if (this.selectedEventIds.has(eventId)) {
      this.selectedEventIds.delete(eventId);
    } else {
      this.selectedEventIds.add(eventId);
    }
  }

  isEventSelected(eventId: number): boolean {
    return this.selectedEventIds.has(eventId);
  }

  deleteSelectedEvents(): void {
    if (this.selectedEventIds.size === 0) return;

    if (!confirm(`Delete ${this.selectedEventIds.size} selected event(s)? This cannot be undone.`)) return;

    this.calendarApi.deleteBulk(Array.from(this.selectedEventIds))
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.selectedEventIds.clear();
        this.selectMode = false;
        this.loadMonthEvents();
        this.loadBackendPanels();
      });
  }

  // ======================================================
  // POSTPONE (quick action kept for month/week hover use)
  // ======================================================
  postponeEvent(eventId: number, mouseEvent?: Event): void {
    if (mouseEvent) mouseEvent.stopPropagation();

    const event = this.events.find(e => e.event_id === eventId);
    if (event) this.openPostponeModal(event);
  }

  // ======================================================
  // YEAR VIEW ACTIONS
  // ======================================================
  openMonthView(monthIndex: number): void {
    this.selectedMonth = monthIndex;
    this.viewMode = 'month';
    this.refreshCalendar();
  }

  // ======================================================
  // MONTH EVENT COUNT
  // ======================================================
  getMonthEventCount(monthIndex: number): number {
    return this.events.filter((event) => {
      const d = new Date(event.start_time);
      return d.getMonth() === monthIndex && d.getFullYear() === this.selectedYear;
    }).length;
  }

  // ======================================================
  // DESTROY
  // ======================================================
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}