import { Point } from '../domain/point';
import { Sample } from '../domain/sample';
import { SampleGroup } from '../domain/samplegroup';
import { TrainData } from '../domain/traindata';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SamplesService {

  points: Point[] = [];

  private samples: Sample[] = [];
  sampleGroups: SampleGroup[] = [];

  private letterIndex = new Map<string, SampleGroup>();

  sensorWidth = 12;
  sensorHeight = 12;

  addSample(sample: Sample) {
    if (sample.letter === null) { return; }
    const existing = this.letterIndex.get(sample.letter);
    if (existing === undefined) {
      const group: SampleGroup = { letter: sample.letter, count: 0, out: 0 };
      this.letterIndex.set(sample.letter, group);
      this.sampleGroups.push(group);
      if (sample.points.length > 0) {
        group.count++;
        this.samples.push(sample);
      }
    } else {
      if (sample.points.length > 0) {
        existing.count++;
        this.samples.push(sample);
      }
    }
  }

  outputFromSample(sample: Sample): number[] {
    const outputs = [];
    for (let i = 0; i < this.sampleGroups.length; i++) {
      outputs.push(this.sampleGroups[i].letter === sample.letter ? 1 : 0);
    }
    return outputs;
  }

  private getBoundingBox(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
    let maxX = -Infinity, maxY = -Infinity;
    let minX = Infinity, minY = Infinity;
    for (const point of points) {
      if (point.x > maxX) { maxX = point.x; }
      if (point.x < minX) { minX = point.x; }
      if (point.y > maxY) { maxY = point.y; }
      if (point.y < minY) { minY = point.y; }
    }
    return { minX, minY, maxX, maxY };
  }

  gridFromSample(sample: Sample): number[] {
    const { minX, minY, maxX, maxY } = this.getBoundingBox(sample.points);

    const gridPoints = new Array(this.sensorWidth * this.sensorHeight).fill(0);

    for (const point of sample.points) {
      const gridX = this.sensorWidth * (point.x - minX) / (maxX - minX + 1);
      const gridY = this.sensorHeight * (point.y - minY) / (maxY - minY + 1);
      gridPoints[Math.floor(gridX) + this.sensorWidth * Math.floor(gridY)] = 1;
    }

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
