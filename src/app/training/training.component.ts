import { TrainingService } from '../services/training.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-training',
  templateUrl: './training.component.html',
  styleUrls: ['./training.component.css']
})
export class TrainingComponent implements OnInit {

  constructor(private trainingService: TrainingService) { }

  progress = '';
  result = '';
  trainingStarted = false;

  ngOnInit() {
  }

  create() {
    if (!this.trainingService.net) {
      this.trainingService.createNet();
    }

    this.trainingStarted = !this.trainingStarted;
    this.train();
  }

  train() {
    if (this.trainingStarted) {
      this.trainingService.trainCycle();
      this.progress += '. ';
      setTimeout(() => {
        this.train();
      }, 100);
    }
  }

  check() {
    this.result = this.trainingService.getResult();
    setTimeout(() => {
      this.result = '';
    }, 1000);
  }

}
