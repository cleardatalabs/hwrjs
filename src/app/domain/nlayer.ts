import { NNeuron } from './nneuron';
export class NLayer {
  neurons: NNeuron[] = [];
  numInputs = 0;

  constructor(numNeurons: number, numInputs: number) {
    this.neurons = new Array();
    this.numInputs = numInputs;
    for (let i = 0; i < numNeurons; i++) {
      this.neurons.push(new NNeuron(numInputs));
    }
  }

  propForward(inputs: number[]) {
    for (let i = 0; i < this.neurons.length; i++) {
      this.neurons[i].propForward(inputs);
    }
  }

  getOutputs(): number[] {
    const outputs: number[] = [];
    for (let i = 0; i < this.neurons.length; i++) {
      outputs.push(this.neurons[i].output);
    }
    return outputs;
  }

  // TODO: move to neuron
  calcOwnError(errors: number[]) {
    for (let i = 0; i < this.neurons.length; i++) {
      this.neurons[i].error = errors[i] * this.neurons[i].sigmaDelta();
    }
  }

  errorsForSelf(targets: number[]): number[] {
    const errors: number[] = new Array();
    for (let i = 0; i < this.neurons.length; i++) {
      errors.push(this.neurons[i].output - targets[i]);
    }
    return errors;
  }

  errorsForPrevious(): number[] {
    const errors: number[] = new Array();
    for (let i = 0; i < this.numInputs; i++) {
      let error = 0;
      for (const neuron of this.neurons) {
        error += neuron.error * neuron.weights[i];
      }
      errors.push(error);
    }
    return errors;
  }

  updateWeights(inputs: number[]) {
    for (const neuron of this.neurons) {
      for (let i = 0; i < neuron.weights.length; i++) {
        neuron.weights[i] -= NNeuron.M * inputs[i] * neuron.error;
      }
    }
  }
}
