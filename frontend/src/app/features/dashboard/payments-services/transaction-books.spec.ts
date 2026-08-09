import { TestBed } from '@angular/core/testing';

import { TransactionBooks } from './transaction-books';

describe('TransactionBooks', () => {
  let service: TransactionBooks;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransactionBooks);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
