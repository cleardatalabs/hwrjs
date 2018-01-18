import {NNet} from '../domain/nnet';
import { TrainData } from '../domain/traindata';
import { SamplesService } from './samples.service';
import {Injectable} from '@angular/core';
import {Subject} from "rxjs/Subject";

@Injectable()
export class TrainingService {

  constructor(private samplesService: SamplesService) {}

  itersPerCycle = 100;
  private resultSource = new Subject<string>();
  result$ = this.resultSource.asObservable();

  net: NNet;
  trainData: TrainData[];

  createNet() {
    const numInputs
      = this.samplesService.sensorWidth * this.samplesService.sensorHeihht;

    const numOutputs
      = this.samplesService.sampleGroups.length;

    this.net = new NNet(numInputs,
      [ numInputs, numOutputs ]);

    this.trainData = this.samplesService.getTrainData();

    console.log('Net created');
  }

  trainCycle() {
    for (let i = 0; i < this.itersPerCycle; i++) {
      for (const trainSet of this.trainData) {
        this.net.trainSample(trainSet.inputs, trainSet.outputs);
      }
    }
  }

  calcMSE(): number {
    let err = 0.;

      for (const trainSet of this.trainData) {
        this.net.propForward(trainSet.inputs);
        err += this.net.layers[this.net.layers.length - 1].errorsForSelf(trainSet.outputs)
          .reduce((a, b) => a + b * b, 0);
      }

    return err / this.trainData.length;
  }

  getResult() {
    const out = this.net.propForward(this.samplesService.gridFromSample({
      points: this.samplesService.points,
      letter: null
    }));

    let maxValue = out[0];
    let maxIndex = 0;
    for (let i = 0; i < out.length; i++) {
      if (out[i] > maxValue) {
        maxValue = out[i];
        maxIndex = i;
      }
    }


    let res = this.samplesService.sampleGroups[maxIndex].letter;
    this.resultSource.next(res);
  }
}
