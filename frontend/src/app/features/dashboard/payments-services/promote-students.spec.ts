import { TestBed } from '@angular/core/testing';

import { PromoteStudents } from './promote-students';

describe('PromoteStudents', () => {
  let service: PromoteStudents;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PromoteStudents);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
