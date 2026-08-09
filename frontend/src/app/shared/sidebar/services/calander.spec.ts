import { TestBed } from '@angular/core/testing';

import { Calander } from './calander';

describe('Calander', () => {
  let service: Calander;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Calander);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
