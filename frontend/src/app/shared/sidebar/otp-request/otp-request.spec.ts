import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OtpRequest } from './otp-request';

describe('OtpRequest', () => {
  let component: OtpRequest;
  let fixture: ComponentFixture<OtpRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OtpRequest],
    }).compileComponents();

    fixture = TestBed.createComponent(OtpRequest);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
