import { TestBed } from '@angular/core/testing';

import { TutionTransaction } from './tution-transaction';

describe('TutionTransaction', () => {
  let service: TutionTransaction;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TutionTransaction);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
