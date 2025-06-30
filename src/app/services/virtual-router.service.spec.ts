import { TestBed } from '@angular/core/testing';

import { VirtualRouterService } from './virtual-router.service';

describe('VirtualRouterService', () => {
  let service: VirtualRouterService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VirtualRouterService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
