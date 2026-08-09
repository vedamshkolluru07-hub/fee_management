// src/app/shared/sidebar/connect-links/connect-links.ts
//
// Admin screen: manage social/contact links for the public floating
// widget, plus the public site's color theme.

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConnectLinksAdminService } from '../services/connect-links';
import { ConnectLinkAdmin, SiteTheme } from '../../../core/services/website';

@Component({
  selector: 'app-connect-links',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './connect-links.html',
  styleUrl: './connect-links.css',
})
export class ConnectLinksComponent implements OnInit {
  private service = inject(ConnectLinksAdminService);

  links = signal<ConnectLinkAdmin[]>([]);
  loading = signal(true);
  savingLinks = signal(false);
  linksMessage = signal<string | null>(null);

  theme: SiteTheme = {
    primary_color: '#2563eb',
    secondary_color: '#f3f4f6',
    background_color: '#ffffff',
    text_color: '#111827',
  };
  savingTheme = signal(false);
  themeMessage = signal<string | null>(null);

  ngOnInit(): void {
    this.loadLinks();
    this.loadTheme();
  }

  loadLinks(): void {
    this.loading.set(true);
    this.service.getAllLinks().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) this.links.set(res.data);
      },
      error: () => this.loading.set(false),
    });
  }

  loadTheme(): void {
    this.service.getTheme().subscribe({
      next: (res) => {
        if (res.success && res.data) this.theme = res.data;
      },
    });
  }

  saveLink(link: ConnectLinkAdmin): void {
    this.savingLinks.set(true);
    this.service.updateLink(link.platform, { value: link.value, isEnabled: link.is_enabled }).subscribe({
      next: (res) => {
        this.savingLinks.set(false);
        this.linksMessage.set(res.success ? `Saved ${link.platform}` : res.message || 'Save failed');
      },
      error: () => {
        this.savingLinks.set(false);
        this.linksMessage.set('Save failed');
      },
    });
  }

  saveTheme(): void {
    this.savingTheme.set(true);
    this.service
      .updateTheme({
        primaryColor: this.theme.primary_color,
        secondaryColor: this.theme.secondary_color,
        backgroundColor: this.theme.background_color,
        textColor: this.theme.text_color,
      })
      .subscribe({
        next: (res) => {
          this.savingTheme.set(false);
          this.themeMessage.set(res.success ? '✅ Theme updated — reflected on the public site.' : res.message || 'Save failed');
        },
        error: () => {
          this.savingTheme.set(false);
          this.themeMessage.set('Save failed');
        },
      });
  }
}
