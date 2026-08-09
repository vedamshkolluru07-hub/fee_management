// src/app/shared/sidebar/about-editor/about-editor.ts

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AboutEditorService } from '../services/about-editor';
import { AboutBlock } from '../../../core/services/website';

@Component({
  selector: 'app-about-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './about-editor.html',
  styleUrl: './about-editor.css',
})
export class AboutEditorComponent implements OnInit {
  private service = inject(AboutEditorService);

  blocks = signal<AboutBlock[]>([]);
  loading = signal(true);
  saving = signal(false);
  message = signal<string | null>(null);
  newText = '';

  ngOnInit(): void {
    this.loadDraft();
  }

  loadDraft(): void {
    this.loading.set(true);
    this.service.getDraft().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) this.blocks.set(res.data);
      },
      error: () => this.loading.set(false),
    });
  }

  addBlock(): void {
    if (!this.newText.trim()) return;
    this.service
      .createBlock({ textContent: this.newText.trim(), displayOrder: this.blocks().length })
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.blocks.update((b) => [...b, res.data as AboutBlock]);
            this.newText = '';
          }
        },
      });
  }

  updateText(block: AboutBlock, value: string): void {
    this.blocks.update((list) => list.map((b) => (b.id === block.id ? { ...b, text_content: value } : b)));
    this.service.updateBlock(block.id, { textContent: value }).subscribe();
  }

  moveUp(index: number): void {
    if (index === 0) return;
    this.swap(index, index - 1);
  }

  moveDown(index: number): void {
    if (index === this.blocks().length - 1) return;
    this.swap(index, index + 1);
  }

  private swap(i: number, j: number): void {
    const list = [...this.blocks()];
    [list[i], list[j]] = [list[j], list[i]];
    this.blocks.set(list);
    list.forEach((b, idx) => this.service.updateBlock(b.id, { displayOrder: idx }).subscribe());
  }

  deleteBlock(block: AboutBlock): void {
    this.service.deleteBlock(block.id).subscribe({
      next: (res) => {
        if (res.success) this.blocks.update((list) => list.filter((b) => b.id !== block.id));
      },
    });
  }

  publish(): void {
    this.saving.set(true);
    this.service.publish().subscribe({
      next: (res) => {
        this.saving.set(false);
        this.message.set(res.success ? '✅ Published to the live About page.' : res.message || 'Publish failed');
      },
      error: () => {
        this.saving.set(false);
        this.message.set('Publish failed');
      },
    });
  }

  discardDraft(): void {
    if (!confirm('Discard all unsaved changes and revert to the last published version?')) return;
    this.saving.set(true);
    this.service.discardDraft().subscribe({
      next: () => {
        this.saving.set(false);
        this.loadDraft();
      },
      error: () => this.saving.set(false),
    });
  }
}
