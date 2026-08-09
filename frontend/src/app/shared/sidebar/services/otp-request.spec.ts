import { TestBed } from '@angular/core/testing';

import { OtpRequest } from './otp-request';

describe('OtpRequest', () => {
  let service: OtpRequest;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OtpRequest);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
