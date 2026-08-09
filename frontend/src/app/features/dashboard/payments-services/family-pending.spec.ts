import { TestBed } from '@angular/core/testing';

import { FamilyPending } from './family-pending';

describe('FamilyPending', () => {
  let service: FamilyPending;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FamilyPending);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
