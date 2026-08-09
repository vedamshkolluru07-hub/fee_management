// src/app/layouts/public-layout/public-layout.ts

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterLink } from '@angular/router';
import { ConnectWidgetComponent } from '../../shared/connect-widget/connect-widget';
import { PublicContentService } from '../../core/services/website';

@Component({
  selector: 'app-public-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, ConnectWidgetComponent],
  templateUrl: './public-layout.html',
  styleUrl: './public-layout.css',
})
export class PublicLayout implements OnInit {
  private publicContent = inject(PublicContentService);

  ngOnInit(): void {
    // Apply admin-configured colors to the public site only,
    // via CSS custom properties scoped to .public-shell.
    this.publicContent.getTheme().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const root = document.querySelector('.public-shell') as HTMLElement | null;
          if (root) {
            root.style.setProperty('--pub-primary', res.data.primary_color);
            root.style.setProperty('--pub-secondary', res.data.secondary_color);
            root.style.setProperty('--pub-bg', res.data.background_color);
            root.style.setProperty('--pub-text', res.data.text_color);
          }
        }
      },
    });
  }
}
