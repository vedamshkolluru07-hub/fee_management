// src/app/shared/sidebar/home-editor/home-editor.ts
//
// Admin canvas editor for the public Home page. Free-form drag
// positioning (stored as % so the public page can fall back to a
// stacked layout on mobile). Draft/Publish workflow.

import { Component, OnInit, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HomeEditorService } from '../services/home-editor';
import { HomeBlock } from '../../../core/services/website';

@Component({
  selector: 'app-home-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-editor.html',
  styleUrl: './home-editor.css',
})
export class HomeEditorComponent implements OnInit {
  private service = inject(HomeEditorService);

  @ViewChild('canvas') canvasRef!: ElementRef<HTMLDivElement>;

  blocks = signal<HomeBlock[]>([]);
  loading = signal(true);
  saving = signal(false);
  message = signal<string | null>(null);
  selectedBlockId = signal<number | null>(null);

  newTextValue = '';

  private dragState: { id: number; startX: number; startY: number; origX: number; origY: number } | null = null;

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

  // ======================================================
  // ADD BLOCKS
  // ======================================================
  addTextBlock(): void {
    if (!this.newTextValue.trim()) return;
    this.service
      .createBlock({
        blockType: 'text',
        textContent: this.newTextValue.trim(),
        posX: 10,
        posY: 10,
        width: 30,
        height: 15,
        zIndex: this.blocks().length,
      } as any)
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.blocks.update((b) => [...b, res.data as HomeBlock]);
            this.newTextValue = '';
          }
        },
      });
  }

  onImagesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files.length) return;
    const files = Array.from(input.files);

    this.saving.set(true);
    this.service.uploadImages(files, 'homepage').subscribe({
      next: (uploadRes) => {
        this.saving.set(false);
        if (!uploadRes.success || !uploadRes.data) {
          this.message.set(uploadRes.message || 'Upload failed');
          return;
        }
        this.service
          .createBlock({
            blockType: 'image',
            images: uploadRes.data,
            posX: 40,
            posY: 10,
            width: 35,
            height: 25,
            zIndex: this.blocks().length,
          } as any)
          .subscribe({
            next: (res) => {
              if (res.success && res.data) {
                this.blocks.update((b) => [...b, res.data as HomeBlock]);
              }
            },
          });
      },
      error: () => {
        this.saving.set(false);
        this.message.set('Upload failed');
      },
    });

    input.value = '';
  }

  // ======================================================
  // DRAG TO REPOSITION (free x/y, stored as %)
  // ======================================================
  startDrag(event: MouseEvent, block: HomeBlock): void {
    this.selectedBlockId.set(block.id);
    this.dragState = {
      id: block.id,
      startX: event.clientX,
      startY: event.clientY,
      origX: block.pos_x,
      origY: block.pos_y,
    };
    event.preventDefault();

    const onMove = (moveEvent: MouseEvent) => this.onDragMove(moveEvent);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      this.persistPosition();
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  private onDragMove(event: MouseEvent): void {
    if (!this.dragState || !this.canvasRef) return;
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();

    const deltaXPercent = ((event.clientX - this.dragState.startX) / rect.width) * 100;
    const deltaYPercent = ((event.clientY - this.dragState.startY) / rect.height) * 100;

    const newX = Math.max(0, Math.min(95, this.dragState.origX + deltaXPercent));
    const newY = Math.max(0, Math.min(95, this.dragState.origY + deltaYPercent));

    this.blocks.update((list) =>
      list.map((b) => (b.id === this.dragState!.id ? { ...b, pos_x: newX, pos_y: newY } : b))
    );
  }

  private persistPosition(): void {
    if (!this.dragState) return;
    const block = this.blocks().find((b) => b.id === this.dragState!.id);
    this.dragState = null;
    if (!block) return;
    this.service.updateBlock(block.id, { posX: block.pos_x, posY: block.pos_y } as any).subscribe();
  }

  // ======================================================
  // EDIT / DELETE
  // ======================================================
  updateTextContent(block: HomeBlock, value: string): void {
    this.blocks.update((list) => list.map((b) => (b.id === block.id ? { ...b, text_content: value } : b)));
    this.service.updateBlock(block.id, { textContent: value } as any).subscribe();
  }

  resizeBlock(block: HomeBlock, width: number, height: number): void {
    this.blocks.update((list) =>
      list.map((b) => (b.id === block.id ? { ...b, width, height } : b))
    );
    this.service.updateBlock(block.id, { width, height } as any).subscribe();
  }

  deleteBlock(block: HomeBlock): void {
    this.service.deleteBlock(block.id).subscribe({
      next: (res) => {
        if (res.success) {
          this.blocks.update((list) => list.filter((b) => b.id !== block.id));
        }
      },
    });
  }

  // ======================================================
  // PUBLISH / DISCARD
  // ======================================================
  publish(): void {
    this.saving.set(true);
    this.service.publish().subscribe({
      next: (res) => {
        this.saving.set(false);
        this.message.set(res.success ? '✅ Published to the live home page.' : res.message || 'Publish failed');
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
