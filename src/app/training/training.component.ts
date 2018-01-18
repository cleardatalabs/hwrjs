import { TrainingService } from '../services/training.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-training',
  templateUrl: './training.component.html',
  styleUrls: ['./training.component.css']
})
export class TrainingComponent implements OnInit {

  constructor(private trainingService: TrainingService) { }

  errInital = 0;
  errCurrent = 0;
  iterations = 0;
  trainingStarted = false;

  ngOnInit() {
  }

  create() {
    if (!this.trainingService.net) {
      this.trainingService.createNet();
      this.errInital = this.trainingService.calcMSE();
      this.iterations = 0;
    }

    this.trainingStarted = !this.trainingStarted;
    this.train();
  }

  train() {
    if (this.trainingStarted) {
      this.trainingService.trainCycle();
      this.iterations += this.trainingService.itersPerCycle;
      this.errCurrent = this.trainingService.calcMSE();

      setTimeout(() => {
        this.train();
      }, 50);
    }
  }

  check() {
    this.trainingService.getResult();
  }

}
