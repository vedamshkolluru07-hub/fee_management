import { TestBed } from '@angular/core/testing';

import { DeleteStudents } from './delete-students';

describe('DeleteStudents', () => {
  let service: DeleteStudents;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeleteStudents);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
