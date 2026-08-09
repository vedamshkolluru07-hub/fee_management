import { TestBed } from '@angular/core/testing';

import { TransactionUniform } from './transaction-uniform';

describe('TransactionUniform', () => {
  let service: TransactionUniform;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionUniform);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
