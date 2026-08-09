// src/app/shared/connect-widget/connect-widget.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectLinksService, ConnectLinkPublic, ConnectPlatform } from '../../core/services/website';

interface PlatformMeta {
  label: string;
  icon: string; // simple emoji/glyph, no external icon lib required
  colorVar: string;
}

const PLATFORM_META: Record<ConnectPlatform, PlatformMeta> = {
  whatsapp:  { label: 'WhatsApp',  icon: '💬', colorVar: '#25D366' },
  instagram: { label: 'Instagram', icon: '📷', colorVar: '#E1306C' },
  facebook:  { label: 'Facebook',  icon: '📘', colorVar: '#1877F2' },
  email:     { label: 'Email',     icon: '✉️', colorVar: '#6b7280' },
  phone:     { label: 'Call',      icon: '📞', colorVar: '#16a34a' },
  youtube:   { label: 'YouTube',   icon: '▶️', colorVar: '#FF0000' },
  linkedin:  { label: 'LinkedIn',  icon: '💼', colorVar: '#0A66C2' },
  twitter:   { label: 'Twitter/X', icon: '𝕏', colorVar: '#111827' },
};

@Component({
  selector: 'app-connect-widget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './connect-widget.html',
  styleUrl: './connect-widget.css',
})
export class ConnectWidgetComponent implements OnInit {
  private connectLinksService = inject(ConnectLinksService);

  links = signal<ConnectLinkPublic[]>([]);
  open = signal(false);
  meta = PLATFORM_META;

  ngOnInit(): void {
    this.connectLinksService.getEnabledLinks().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.links.set(res.data);
        }
      },
    });
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  labelFor(platform: ConnectPlatform): string {
    return this.meta[platform]?.label ?? platform;
  }

  iconFor(platform: ConnectPlatform): string {
    return this.meta[platform]?.icon ?? '🔗';
  }
}
