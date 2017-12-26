import { TestBed, inject } from '@angular/core/testing';

import { SamplesService } from './samples.service';

describe('SamplesService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SamplesService]
    });
  });

  it('should be created', inject([SamplesService], (service: SamplesService) => {
    expect(service).toBeTruthy();
  }));
});
