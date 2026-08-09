import { TestBed } from '@angular/core/testing';

import { AcademicUpdate } from './academic-update';

describe('AcademicUpdate', () => {
  let service: AcademicUpdate;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AcademicUpdate);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
