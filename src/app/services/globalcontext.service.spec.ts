import { TestBed } from '@angular/core/testing';

import { GlobalcontextService } from './globalcontext.service';

describe('GlobalcontextService', () => {
  let service: GlobalcontextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GlobalcontextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
