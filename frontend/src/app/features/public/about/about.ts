// src/app/features/public/about/about.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicContentService, AboutBlock } from '../../../core/services/website';

@Component({
  selector: 'app-public-about',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class PublicAbout implements OnInit {
  private publicContent = inject(PublicContentService);

  blocks = signal<AboutBlock[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.publicContent.getPublishedAboutBlocks().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.blocks.set(res.data);
        }
      },
      error: () => this.loading.set(false),
    });
  }
}
