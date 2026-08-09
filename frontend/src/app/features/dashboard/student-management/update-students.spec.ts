import { TestBed } from '@angular/core/testing';

import { UpdateStudents } from './update-students';

describe('UpdateStudents', () => {
  let service: UpdateStudents;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UpdateStudents);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
