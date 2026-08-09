import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginAttempts } from './login-attempts';

describe('LoginAttempts', () => {
  let component: LoginAttempts;
  let fixture: ComponentFixture<LoginAttempts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginAttempts],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginAttempts);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
