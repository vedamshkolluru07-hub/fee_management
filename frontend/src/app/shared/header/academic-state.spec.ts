import { TestBed } from '@angular/core/testing';

import { AcademicState } from './academic-state';

describe('AcademicState', () => {
  let service: AcademicState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AcademicState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
