import { TestBed } from '@angular/core/testing';

import { AppSettings } from './app-settings';

describe('AppSettings', () => {
  let service: AppSettings;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppSettings);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
