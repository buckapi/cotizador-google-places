import { TestBed } from '@angular/core/testing';

import { TravelDataService } from './travel-data.service';

describe('TravelDataService', () => {
  let service: TravelDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TravelDataService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
