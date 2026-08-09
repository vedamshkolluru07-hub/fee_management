import { TestBed } from '@angular/core/testing';

import { ViewStudents } from './view-students';

describe('ViewStudents', () => {
  let service: ViewStudents;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ViewStudents);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
