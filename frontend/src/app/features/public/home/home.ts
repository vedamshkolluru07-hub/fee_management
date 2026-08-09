// src/app/features/public/home/home.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PublicContentService, HomeBlock } from '../../../core/services/website';
import { EnquiryBoxComponent } from '../../../shared/enquiry-box/enquiry-box';

@Component({
  selector: 'app-public-home',
  standalone: true,
  imports: [CommonModule, EnquiryBoxComponent],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class PublicHome implements OnInit {
  private publicContent = inject(PublicContentService);

  blocks = signal<HomeBlock[]>([]);
  loading = signal(true);

  // active carousel image index per block id
  activeImageIndex: Record<number, number> = {};
  private carouselTimers: Record<number, ReturnType<typeof setInterval>> = {};

  ngOnInit(): void {
    this.publicContent.getPublishedHomeBlocks().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.blocks.set(res.data);
          this.setupCarousels(res.data);
        }
      },
      error: () => this.loading.set(false),
    });
  }

  private setupCarousels(blocks: HomeBlock[]): void {
    for (const block of blocks) {
      if (block.block_type === 'image' && block.images?.length > 1) {
        this.activeImageIndex[block.id] = 0;
        this.carouselTimers[block.id] = setInterval(() => {
          const total = block.images.length;
          this.activeImageIndex[block.id] = (this.activeImageIndex[block.id] + 1) % total;
        }, 3500);
      }
    }
  }

  ngOnDestroy(): void {
    Object.values(this.carouselTimers).forEach((timer) => clearInterval(timer));
  }

  blockStyle(block: HomeBlock) {
    return {
      left: `${block.pos_x}%`,
      top: `${block.pos_y}%`,
      width: `${block.width}%`,
      height: `${block.height}%`,
      'z-index': block.z_index,
      ...(block.style || {}),
    };
  }

  currentImage(block: HomeBlock) {
    const idx = this.activeImageIndex[block.id] ?? 0;
    return block.images?.[idx];
  }
}
