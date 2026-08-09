import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  NotificationsService,
  NotificationItem,
} from '../../../shared/sidebar/services/notification';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification.html',
  styleUrl: './notification.css',
})
export class Notification implements OnInit {
  private notificationsService = inject(NotificationsService);

  /* ======================================================
     🔹 STATE
  ====================================================== */

  notifications = signal<NotificationItem[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  unreadCount = signal(0);

  search = signal('');
  selectedType = signal('');
  showUnreadOnly = signal(false);

  limit = 20;
  offset = 0;

  /* ======================================================
     🔹 COMPUTED
  ====================================================== */

  filteredNotifications = computed(() => {
    return this.notifications();
  });

  /* ======================================================
     🔹 INIT
     (userId removed — server identifies the user via the
     session cookie on every request, so the client never
     needs to know or send it)
  ====================================================== */

  ngOnInit(): void {
    this.loadNotifications();
    this.loadUnreadCount();
  }

  /* ======================================================
     🔹 LOAD NOTIFICATIONS
  ====================================================== */

  loadNotifications(): void {
    this.loading.set(true);
    this.error.set(null);

    this.notificationsService
      .getNotifications({
        search: this.search(),
        type: this.selectedType() || undefined,
        read: this.showUnreadOnly() ? false : undefined,
        limit: this.limit,
        offset: this.offset,
      })
      .subscribe({
        next: (response) => {
          this.notifications.set(response.data.notifications);
          this.unreadCount.set(response.data.unread_count);
          this.loading.set(false);
        },
        error: (err) => {
          console.error(err);

          this.error.set(
            err?.error?.message || 'Failed to load notifications'
          );

          this.loading.set(false);
        },
      });
  }

  /* ======================================================
     🔹 LOAD UNREAD COUNT
  ====================================================== */

  loadUnreadCount(): void {
    this.notificationsService
      .getUnreadCount()
      .subscribe({
        next: (response) => {
          this.unreadCount.set(response.unread_count);
        },
      });
  }

  /* ======================================================
     🔹 MARK SINGLE AS READ
  ====================================================== */

  markAsRead(notification: NotificationItem): void {
    if (notification.is_read) return;

    this.notificationsService
      .markMultipleAsRead([notification.notification_id])
      .subscribe({
        next: () => {
          this.notifications.update((items) =>
            items.map((n) =>
              n.notification_id === notification.notification_id
                ? {
                    ...n,
                    is_read: true,
                  }
                : n
            )
          );

          this.loadUnreadCount();
        },
      });
  }

  /* ======================================================
     🔹 MARK ALL AS READ
  ====================================================== */

  markAllAsRead(): void {
    const unreadIds = this.notifications()
      .filter((n) => !n.is_read)
      .map((n) => n.notification_id);

    if (!unreadIds.length) return;

    this.notificationsService
      .markMultipleAsRead(unreadIds)
      .subscribe({
        next: () => {
          this.notifications.update((items) =>
            items.map((n) => ({
              ...n,
              is_read: true,
            }))
          );

          this.unreadCount.set(0);
        },
      });
  }

  /* ======================================================
     🔹 DELETE NOTIFICATION
  ====================================================== */

  deleteNotification(notification_id: string): void {
    this.notificationsService
      .deleteNotification(notification_id)
      .subscribe({
        next: () => {
          this.notifications.update((items) =>
            items.filter(
              (n) => n.notification_id !== notification_id
            )
          );

          this.loadUnreadCount();
        },
      });
  }

  /* ======================================================
     🔹 SEARCH / FILTER
  ====================================================== */

  applyFilters(): void {
    this.offset = 0;
    this.loadNotifications();
  }

  /* ======================================================
     🔹 TRACK BY
  ====================================================== */

  trackByNotification(
    index: number,
    item: NotificationItem
  ): string {
    return item.notification_id;
  }
}