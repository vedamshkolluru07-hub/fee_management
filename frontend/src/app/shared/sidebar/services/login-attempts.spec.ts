import { TestBed } from '@angular/core/testing';

import { LoginAttempts } from './login-attempts';

describe('LoginAttempts', () => {
  let service: LoginAttempts;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoginAttempts);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
