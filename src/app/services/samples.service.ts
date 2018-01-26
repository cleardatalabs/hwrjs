import { Point } from '../domain/point';
import { Sample } from '../domain/sample';
import { SampleGroup } from '../domain/samplegroup';
import { TrainData } from '../domain/traindata';
import { Injectable } from '@angular/core';

@Injectable()
export class SamplesService {

  constructor() { }

  points: Point[] = [];

  private samples: Sample[] = [];
  sampleGroups: SampleGroup[] = [];

  private letterIndex: SampleGroup[] = [];

  sensorWidth = 12;
  sensorHeihht = 12;

  // TODO : use map
  addSample(sample: Sample) {
    console.log('add sample 1');
    console.log(this.letterIndex[sample.letter]);
    if (this.letterIndex[sample.letter] === undefined) {
      const group: SampleGroup = {letter: sample.letter, count: 0};
      this.letterIndex[sample.letter] = group;
      this.sampleGroups.push(group);
      console.log(this.sampleGroups);
      if (sample.points.length > 0) {
        group.count++;
        this.samples.push(sample);
      }
    } else {
      if (sample.points.length > 0) {
        this.letterIndex[sample.letter].count++;
        this.samples.push(sample);
      }
    }
  }


  outputFromSample(sample: Sample): number[] {
    const outputs = [];

    for (let i = 0; i < this.sampleGroups.length; i++) {
      if (this.sampleGroups[i].letter === sample.letter) {
        outputs.push(1);
      } else {
        outputs.push(0);
      }
    }

    return outputs;
  }

  // TODO: split into 2
  gridFromSample(sample: Sample): number[] {
    let maxX = -Infinity, maxY = -Infinity;
    let minX = Infinity, minY = Infinity;
    for (const point of sample.points) {
      if (point.x > maxX) {
        maxX = point.x;
      }
      if (point.x < minX) {
        minX = point.x;
      }

      if (point.y > maxY) {
        maxY = point.y;
      }
      if (point.y < minY) {
        minY = point.y;
      }
    }

    console.log(minX + ' ' + minY + ' ' + maxX + ' ' + maxY);

    const gridPoints = new Array(this.sensorWidth * this.sensorHeihht);
    gridPoints.fill(0);

    for (const point of sample.points) {
      const gridX = this.sensorWidth * (point.x - minX) / (maxX - minX + 1);
      const gridY = this.sensorHeihht * (point.y - minY) / (maxY - minY + 1);

      gridPoints[Math.floor(gridX) + this.sensorWidth * Math.floor(gridY)] = 1;
      console.log(Math.floor(gridX) + ' ' + Math.floor(gridY));
    }

    let res = '';
    for (let i = 0; i < gridPoints.length; i++) {
      if ((i % this.sensorWidth) === 0) {
        res += '\n';
      }
      res += gridPoints[i];
    }
    console.log(res);
    return gridPoints;
  }

  getTrainData(): TrainData[] {
    const data: TrainData[] = [];
    for (const sample of this.samples) {
      data.push({
        inputs: this.gridFromSample(sample),
        outputs: this.outputFromSample(sample)
      });
    }
    return data;
  }
}
