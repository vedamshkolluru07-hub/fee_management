import { TestBed } from '@angular/core/testing';

import { AcademicRead } from './academic-read';

describe('AcademicRead', () => {
  let service: AcademicRead;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AcademicRead);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
