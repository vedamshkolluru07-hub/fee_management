import { TestBed } from '@angular/core/testing';

import { CascadeDelete } from './cascade-delete';

describe('CascadeDelete', () => {
  let service: CascadeDelete;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CascadeDelete);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
