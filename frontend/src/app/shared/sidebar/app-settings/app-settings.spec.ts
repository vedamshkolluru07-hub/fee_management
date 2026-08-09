import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AppSettings } from './app-settings';

describe('AppSettings', () => {
  let component: AppSettings;
  let fixture: ComponentFixture<AppSettings>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppSettings],
    }).compileComponents();

    fixture = TestBed.createComponent(AppSettings);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
