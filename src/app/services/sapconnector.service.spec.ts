import { TestBed } from '@angular/core/testing';

import { SAPconnectorService } from './sapconnector.service';

describe('SAPconnectorService', () => {
  let service: SAPconnectorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SAPconnectorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
