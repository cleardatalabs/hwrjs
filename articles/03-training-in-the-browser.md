# Backprop in the Browser: Training a Net Without Leaving JavaScript

The network exists. It has 144 input neurons, 144 hidden neurons, and N output neurons. Feed it a drawing of the letter "A" and it returns a vector like `[0.47, 0.51, 0.52]` — essentially random. The weights were initialized with `Math.random() * 0.1`, so of course the output is meaningless.

Training changes that. Through thousands of iterations, the network slowly adjusts its weights until the output for "A" looks more like `[0.92, 0.03, 0.05]`. This article explains exactly how that happens: the error signal, backpropagation, the weight update rule, and the engineering trick that keeps the browser responsive while the computation runs.

This is Part 3 of a series. [Part 1](./01-seeing-in-cells.md) covered input encoding; [Part 2](./02-neurons-in-code.md) covered the architecture.

Source code: [github.com/cleardatalabs/hwrjs](https://github.com/cleardatalabs/hwrjs) · Live demo: [cleardatalabs.github.io/hwrjs](https://cleardatalabs.github.io/hwrjs/)

---

## What the network is trying to do

For each training sample, the network knows the correct answer: if the user drew "A", the target output is `[1, 0, 0]` (called a one-hot vector — 1 for the correct letter, 0 for everything else). The network produces some actual output, say `[0.47, 0.51, 0.52]`. Training is the process of nudging the weights so the actual output gets closer to the target.

"Closer" is measured by Mean Squared Error (MSE), computed in `TrainingService.calcMSE()`:

```typescript
// services/training.service.ts
calcMSE(): number {
  let err = 0;
  for (const trainSet of this.trainData) {
    this.net.propForward(trainSet.inputs);
    err += this.net.layers[this.net.layers.length - 1]
      .errorsForSelf(trainSet.outputs)
      .reduce((a, b) => a + b * b, 0);
  }
  return err / this.trainData.length;
}
```

`errorsForSelf(targets)` returns `output - target` for each output neuron. Squaring each difference (via `reduce`) penalizes large errors more than small ones and keeps the total positive. Averaging over all training samples gives a single number: how wrong the network is, overall.

When you click "Train", the UI shows `MSE Initial` and `MSE Current`. A well-trained network drives that second number close to zero.

---

## Backpropagation, step by step

Backpropagation is an application of the chain rule from calculus: to reduce the output error, compute how much each weight contributed to that error, then adjust each weight proportionally.

The implementation is split across three methods.

### Step 1: output layer errors

```typescript
// domain/nlayer.ts
errorsForSelf(targets: number[]): number[] {
  const errors: number[] = [];
  for (let i = 0; i < this.neurons.length; i++) {
    errors.push(this.neurons[i].output - targets[i]);
  }
  return errors;
}
```

For each output neuron, the raw error is simply `output - target`. If the network says 0.47 for "A" and the target is 1.0, the error is −0.53. The sign tells us which direction to move.

That raw error gets converted to a neuron delta by multiplying by the sigmoid derivative:

```typescript
// domain/nneuron.ts
sigmaDelta(): number {
  return this.output * (1 - this.output);
}

calcError(error: number) {
  this.error = error * this.sigmaDelta();
}
```

The sigmoid derivative `output × (1 − output)` is zero when the output is near 0 or 1 (the neuron is already "decided") and maximum at 0.5. This is the chain rule in action: the gradient of the loss with respect to the pre-activation sum is the raw error scaled by how responsive the neuron is at its current activation.

### Step 2: propagate errors backward

Output layer errors are known. Hidden layer errors are computed from them:

```typescript
// domain/nlayer.ts
errorsForPrevious(): number[] {
  const errors: number[] = [];
  for (let i = 0; i < this.numInputs; i++) {
    let error = 0;
    for (const neuron of this.neurons) {
      error += neuron.error * neuron.weights[i];
    }
    errors.push(error);
  }
  return errors;
}
```

For each input position `i`, the error attributed to it is the sum over all neurons of `neuron.error × neuron.weights[i]`. Intuitively: if a weight is large and the downstream neuron has a large error, that input was heavily responsible for the mistake.

`NNet.propBackward()` orchestrates the whole backward pass:

```typescript
// domain/nnet.ts
propBackward(outputs: number[]) {
  const lastLayer = this.layers[this.layers.length - 1];
  lastLayer.calcOwnError(lastLayer.errorsForSelf(outputs));

  for (let i = this.layers.length - 2; i >= 0; i--) {
    this.layers[i].calcOwnError(this.layers[i + 1].errorsForPrevious());
  }
}
```

The error flows from the output layer backward to the first hidden layer. Each layer computes its own deltas based on the layer immediately after it.

### Step 3: update the weights

With deltas in hand, every weight gets adjusted:

```typescript
// domain/nlayer.ts
updateWeights(inputs: number[]) {
  for (const neuron of this.neurons) {
    for (let i = 0; i < neuron.weights.length; i++) {
      neuron.weights[i] -= NNeuron.M * inputs[i] * neuron.error;
    }
  }
}
```

The update rule: `weight -= M × input × error`

- `M = 0.3` is the learning rate — how large a step to take each iteration
- `input` is the activation the weight was multiplied against during the forward pass
- `neuron.error` is the delta computed during backpropagation

If `input` was large and `error` was large, the weight changes significantly — this connection was responsible for a big mistake. If `input` was zero (the cell was empty in the grid), the weight doesn't change at all — an absent feature can't be blamed.

The learning rate of 0.3 is a hyperparameter. Too high and the network overshoots and oscillates; too low and training converges slowly. 0.3 works well for this small network and dataset.

---

## One complete training step

`NNet.trainSample()` ties it all together:

```typescript
// domain/nnet.ts
trainSample(inputs: number[], outputs: number[]) {
  this.propForward(inputs);
  this.propBackward(outputs);
  this.updateWeights(inputs);
}
```

Forward pass → backward pass → weight update. Three lines, repeated for every training sample, thousands of times.

---

## The training loop

`TrainingService.trainCycle()` runs 100 complete passes over all training data:

```typescript
// services/training.service.ts
trainCycle() {
  for (let i = 0; i < this.itersPerCycle; i++) {
    for (const trainSet of this.trainData) {
      this.net.trainSample(trainSet.inputs, trainSet.outputs);
    }
  }
}
```

One iteration = one forward pass + one backward pass + one weight update per training sample. One cycle = 100 iterations over all samples.

---

## The UI synchronization problem

JavaScript in a browser runs on a single thread. If you put all the training in a `while (true)` loop, the page freezes — no repaints, no user interaction — until the loop exits. For a demo that's supposed to show live MSE decreasing, that's unacceptable.

The solution is `setTimeout`:

```typescript
// training.component.ts
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
```

`setTimeout(callback, 50)` schedules the next training cycle to run 50 milliseconds later. Between that call and the next cycle, the browser event loop has a chance to run: it processes any pending input events and repaints the DOM. The user sees the MSE tick downward, the iteration counter increase, and can click "Stop" at any time.

The 100 iterations per cycle × 50ms timeout is the tuning knob. Fewer iterations per cycle makes the UI more responsive but slightly slower to converge; more iterations do the inverse. The current values strike a reasonable balance for a small training set on a modern machine.

A more sophisticated implementation would use a Web Worker to move the computation off the main thread entirely, eliminating the need for the setTimeout rhythm. For a demo that runs in a browser and prioritizes readability over throughput, the timer approach is clean enough — and it makes the training loop visible in the DevTools profiler.

---

## Watching convergence

When you click "Train" for the first time:

1. `createNet()` builds the network with random weights
2. `calcMSE()` runs once to capture `MSE Initial` — typically somewhere between 0.2 and 0.4
3. The training loop starts; `MSE Current` updates every ~50ms
4. After a few hundred iterations, MSE should settle below 0.05 for a well-separated alphabet

Draw a character you trained on and click "Check". The result appears on the canvas, and the confidence bars update to show what the network "thinks" each output neuron is saying.

What does that look like in terms of weights? Early in training, every weight is small and similar. After convergence, the hidden neurons have differentiated: some respond strongly to strokes in the upper-left grid cells, others to the lower-right, and so on. The output neurons have learned which combinations of hidden neuron activations correspond to which letter. You can't read the weights directly — there are 144 × 144 + 144 × N of them — but their effect is visible in the confidence scores.

---

## Limitations and what to try next

This network is a minimal implementation. It works for the demo case, but a few changes would make it more capable:

- **Bias neurons**: every neuron uses a weighted sum with no constant offset. Adding a bias weight (always connected to input 1.0) would let neurons activate even when all real inputs are zero. Bias is standard in modern networks; its absence here is a deliberate simplification.
- **More hidden layers**: one hidden layer limits the complexity of the decision boundaries. A second or third layer could represent more abstract features.
- **Momentum**: the current update rule is plain gradient descent. Adding a momentum term (carrying a fraction of the previous weight update forward) reduces oscillation and often converges faster.
- **Web Worker for training**: move `trainCycle()` to a Worker thread. The main thread stays responsive without needing the 50ms yield trick.

If you want to experiment: fork the repo, change `NNeuron.M` from 0.3 to 0.1 and observe slower convergence; change it to 0.9 and watch the network oscillate. Add a second hidden layer in `createNet()` and see if recognition accuracy improves. The network is small enough that every parameter is accessible in the source.

---

## The complete picture

Three articles, one project. The pieces:

1. **Input encoding** — raw strokes become a 144-element binary grid via bounding-box normalization
2. **Architecture** — a 3-layer perceptron: 144 inputs → 144 hidden → N outputs, each neuron using sigmoid activation
3. **Training** — gradient descent with backpropagation, running in the browser's event loop via `setTimeout`

The result is a handwriting recognizer that runs entirely client-side, built from first principles in about 300 lines of TypeScript. No magic, no library hiding the math, no GPU required.

→ [Part 1: Seeing in Cells](./01-seeing-in-cells.md) · [Part 2: 144 Numbers In, One Letter Out](./02-neurons-in-code.md)

Source code: [github.com/cleardatalabs/hwrjs](https://github.com/cleardatalabs/hwrjs) · Live demo: [cleardatalabs.github.io/hwrjs](https://cleardatalabs.github.io/hwrjs/)
