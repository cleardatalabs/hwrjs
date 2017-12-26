import { TestBed, inject } from '@angular/core/testing';

import { TrainingService } from './training.service';

describe('TrainingService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [TrainingService]
    });
  });

  it('should be created', inject([TrainingService], (service: TrainingService) => {
    expect(service).toBeTruthy();
  }));
});
