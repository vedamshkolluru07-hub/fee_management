import { TestBed } from '@angular/core/testing';

import { AuditLogs } from './audit-logs';

describe('AuditLogs', () => {
  let service: AuditLogs;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuditLogs);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
