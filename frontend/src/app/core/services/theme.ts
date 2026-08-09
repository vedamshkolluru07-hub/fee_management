// src/app/core/services/theme.ts

import { Injectable } from '@angular/core';

export type Theme = 'light' | 'dark' | 'blue' | 'green';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  private readonly STORAGE_KEY = 'app-theme';
  private current: Theme = 'light';

  init(): void {
    const saved = localStorage.getItem(this.STORAGE_KEY) as Theme | null;
    this.apply(saved || 'light');
  }

  apply(theme: Theme): void {
    this.current = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(this.STORAGE_KEY, theme);
  }

  get currentTheme(): Theme {
    return this.current;
  }

  get themes(): { value: Theme; label: string; icon: string }[] {
    return [
      { value: 'light', label: 'Light',  icon: '☀️' },
      { value: 'dark',  label: 'Dark',   icon: '🌙' },
      { value: 'blue',  label: 'Ocean',  icon: '🌊' },
      { value: 'green', label: 'Forest', icon: '🌿' },
    ];
  }
}
