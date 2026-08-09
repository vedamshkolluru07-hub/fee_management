import { TestBed } from '@angular/core/testing';

import { AcademicSetup } from './academic-setup';

describe('AcademicSetup', () => {
  let service: AcademicSetup;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AcademicSetup);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
