import {NLayer} from './nlayer';

export class NNet {
  layers: NLayer[] = [];

  constructor(numInputs: number, numNeuronsPerLayer: number[]) {
    this.layers = new Array();
    this.layers.push(new NLayer(numNeuronsPerLayer[0], numInputs));
    for (let i = 1; i < numNeuronsPerLayer.length; i++) {
      this.layers.push(new NLayer(numNeuronsPerLayer[i], numNeuronsPerLayer[i - 1]));
    }
  }

  propForward(inputs: number[]): number[] {
    let currentInputs: number[] = inputs;
    for (const layer of this.layers) {
      layer.propForward(currentInputs);
      currentInputs = layer.getOutputs();
    }
    return currentInputs;
  }

  propBackward(outputs: number[]) {
    const lastLayer = this.layers[this.layers.length - 1];
    lastLayer.calcOwnError(lastLayer.errorsForSelf(outputs));

    for (let i = this.layers.length - 2; i >= 0; i--) {
      this.layers[i].calcOwnError(this.layers[i + 1].errorsForPrevious());
    }
  }

  updateWeights(inputs: number[]) {
    for (let i = this.layers.length - 1; i > 0; i--) {
      this.layers[i].updateWeights(this.layers[i - 1].getOutputs());
    }
    this.layers[0].updateWeights(inputs);
  }

  trainSample(inputs: number[], outputs: number[]) {
    this.propForward(inputs);
    this.propBackward(outputs);
    this.updateWeights(inputs);
  }
}
