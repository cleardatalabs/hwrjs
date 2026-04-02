export class NNeuron {
  static M = 0.3;

  weights: number[];
  deltas: number[];
  error: number;
  output: number;

  constructor(numInputs: number) {
    this.error = 0;
    this.output = 0;
    this.weights = [];
    this.deltas = [];
    for (let i = 0; i < numInputs; i++) {
      this.weights.push(Math.random() * 0.1);
      this.deltas.push(0.0);
    }
  }

  propForward(inputs: number[]) {
    let sum = 0;
    for (let i = 0; i < inputs.length; i++) {
      sum += inputs[i] * this.weights[i];
    }
    this.sigmaFunction(sum);
  }

  sigmaFunction(x: number) {
    this.output = 1 / (1 + Math.exp(-x));
  }

  sigmaDelta(): number {
    return this.output * (1 - this.output);
  }

  calcError(error: number) {
    this.error = error * this.sigmaDelta();
  }
}
