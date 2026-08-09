import { TestBed } from '@angular/core/testing';

import { DeviceSession } from './device-session';

describe('DeviceSession', () => {
  let service: DeviceSession;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeviceSession);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
