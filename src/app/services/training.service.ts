import {NNet} from '../domain/nnet';
import { TrainData } from '../domain/traindata';
import { SamplesService } from './samples.service';
import {Injectable} from '@angular/core';

@Injectable()
export class TrainingService {

  constructor(private samplesService: SamplesService) {}

  net: NNet;
  trainData: TrainData[];

  createNet() {
    const numInputs
      = this.samplesService.sensorWidth * this.samplesService.sensorHeihht;

    const numOutputs
      = this.samplesService.sampleGroups.length;

    this.net = new NNet(numInputs,
      [ numInputs, Math.floor((numInputs + numOutputs) / 2), numOutputs ]);

    this.trainData = this.samplesService.getTrainData();

    console.log('Net created');
  }

  trainCycle() {
    for (let i = 0; i < 1000; i++) {
      for (const trainSet of this.trainData) {
        this.net.trainSample(trainSet.inputs, trainSet.outputs);
      }
    }
  }

  getResult(): string {
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

    return this.samplesService.sampleGroups[maxIndex].letter;
  }
}
