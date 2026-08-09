import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeviceSession } from './device-session';

describe('DeviceSession', () => {
  let component: DeviceSession;
  let fixture: ComponentFixture<DeviceSession>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeviceSession],
    }).compileComponents();

    fixture = TestBed.createComponent(DeviceSession);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
