# 144 Numbers In, One Letter Out: Building a Neural Net from Scratch

Every neural network tutorial reaches for PyTorch or TensorFlow within the first five minutes. Those libraries are powerful, but they hide the thing that makes neural networks interesting: the math is simple enough to write yourself.

This project does exactly that. The entire neural network — every neuron, every layer, every weight update — lives in three TypeScript files under 200 lines combined. No dependencies beyond the standard library. Runs in a browser tab.

This article walks through the architecture. How a single neuron works, how neurons compose into layers, how layers compose into a network, and how the network turns 144 binary inputs into a single predicted handwritten character.

If you haven't read [Part 1](./01-seeing-in-cells.md), the quick version: user handwriting gets normalized into a 12×12 binary grid — 144 numbers, each 0 or 1, encoding which cells of the grid the pen passed through. That array is the input to everything described here.

Source code: [github.com/cleardatalabs/hwrjs](https://github.com/cleardatalabs/hwrjs) · Live demo: [cleardatalabs.github.io/hwrjs](https://cleardatalabs.github.io/hwrjs/)

---

## The neuron

A neuron takes a list of numbers, computes a weighted sum, squashes the result through a function, and produces a single output number. That's the entirety of it.

```typescript
// domain/nneuron.ts
propForward(inputs: number[]) {
  let sum = 0;
  for (let i = 0; i < inputs.length; i++) {
    sum += inputs[i] * this.weights[i];
  }
  this.sigmaFunction(sum);
}
```

`this.weights` is an array of the same length as `inputs`. Each weight says how much attention the neuron pays to the corresponding input. A large positive weight amplifies that input's influence; a large negative weight suppresses it; near-zero means "mostly ignore this."

The weighted sum is:

```
sum = input[0] × weight[0] + input[1] × weight[1] + ... + input[143] × weight[143]
```

For a neuron connected to the 144-input layer, that's 144 multiplications and 143 additions. Fast, and completely parallelizable.

---

## The activation function

A weighted sum can produce any real number. But probabilities live in [0, 1], and we want outputs that can be interpreted as confidence. The sigmoid function maps any real number into that range:

```typescript
// domain/nneuron.ts
sigmaFunction(x: number) {
  this.output = 1 / (1 + Math.exp(-x));
}
```

The shape: very negative inputs produce outputs close to 0; very positive inputs produce outputs close to 1; near zero, the output is close to 0.5. Plotted, it's an S-curve.

| Input (sum) | Output |
|------------|--------|
| −10        | ~0.000 |
| −2         | ~0.119 |
|  0         | 0.500  |
| +2         | ~0.881 |
| +10        | ~1.000 |

This non-linearity is what makes stacking neurons useful. Without it, a network of any depth would still be a linear transformation, and linear transformations can't represent the curved decision boundaries needed to separate different letter shapes.

---

## Weight initialization

Every weight starts small and random:

```typescript
// domain/nneuron.ts
constructor(numInputs: number) {
  this.weights = [];
  this.deltas = [];
  for (let i = 0; i < numInputs; i++) {
    this.weights.push(Math.random() * 0.1);
    this.deltas.push(0.0);
  }
}
```

`Math.random() * 0.1` gives a value in `[0, 0.1)`. Starting small prevents the sigmoid from saturating immediately (pushing outputs to near-0 or near-1 from the first forward pass, which would make early learning very slow). Starting random breaks symmetry — if all weights were identical, all neurons would learn identical things and the layer would collapse to a single effective neuron.

---

## The layer

A layer is a collection of neurons that all receive the same inputs and produce independent outputs.

```typescript
// domain/nlayer.ts
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
```

Each neuron sees the full input vector and produces one number. The layer collects all those numbers into an output vector. A layer of N neurons transforms an M-dimensional input into an N-dimensional output.

This is a dense (fully connected) layer: every input is connected to every neuron. There are no skip connections, no convolutions, no attention mechanisms. The simplicity is intentional — for an educational project on a fixed alphabet, it's enough.

---

## The network topology

The network is built in `TrainingService.createNet()`:

```typescript
// services/training.service.ts
createNet() {
  const numInputs  = this.samplesService.sensorWidth * this.samplesService.sensorHeight;
  const numOutputs = this.samplesService.sampleGroups.length;
  this.net = new NNet(numInputs, [numInputs, numOutputs]);
}
```

`NNet` takes a number of inputs and an array specifying the neuron count for each layer. The call `new NNet(144, [144, N])` builds:

```
Input (144)
    ↓
Layer 1: 144 neurons  ← hidden layer
    ↓
Layer 2: N neurons    ← output layer, one neuron per letter
```

Where N is the number of distinct characters the user has trained on. Train on A, B, and C — N is 3. Train on all 26 letters — N is 26.

The hidden layer has 144 neurons, matching the input dimension. This is a somewhat arbitrary choice; larger or smaller hidden layers would also work, with different trade-offs in capacity and training speed.

The network is constructed in `NNet`:

```typescript
// domain/nnet.ts
constructor(numInputs: number, numNeuronsPerLayer: number[]) {
  this.layers.push(new NLayer(numNeuronsPerLayer[0], numInputs));
  for (let i = 1; i < numNeuronsPerLayer.length; i++) {
    this.layers.push(new NLayer(numNeuronsPerLayer[i], numNeuronsPerLayer[i - 1]));
  }
}
```

Layer 0 receives `numInputs` (144) inputs from the user's drawing. Layer 1 receives 144 outputs from Layer 0. Each layer's input count is the previous layer's neuron count.

---

## Forward propagation

When the user draws a character and clicks "Check", the network runs `propForward`:

```typescript
// domain/nnet.ts
propForward(inputs: number[]): number[] {
  let currentInputs: number[] = inputs;
  for (const layer of this.layers) {
    layer.propForward(currentInputs);
    currentInputs = layer.getOutputs();
  }
  return currentInputs;
}
```

The 144-element input array flows through Layer 1 (144 neurons → 144 outputs), then through Layer 2 (N neurons → N outputs). The final `currentInputs` is the network's output: an N-element array where each value is between 0 and 1.

---

## Reading the output

The output vector has one element per letter. After training, a well-functioning network produces something like:

```
[0.03, 0.96, 0.02, 0.01]  → "B" (index 1 has the highest activation)
```

The recognition logic in `TrainingService.getResult()` finds the winner:

```typescript
// services/training.service.ts
let maxValue = out[0];
let maxIndex = 0;
for (let i = 0; i < out.length; i++) {
  if (out[i] > maxValue) {
    maxValue = out[i];
    maxIndex = i;
  }
}
const res = this.samplesService.sampleGroups[maxIndex].letter;
this.resultSource.next(res);
```

A simple argmax — find the neuron with the highest activation and return its corresponding letter. The confidence scores (the raw output values) are also displayed in the UI as a horizontal bar next to each letter.

---

## The whole picture

At this point, the architecture is complete:

| Stage | Component | Shape |
|-------|-----------|-------|
| Raw drawing | `DrawingComponent` | `Point[]` (variable length) |
| Grid encoding | `SamplesService.gridFromSample()` | `number[144]` |
| Hidden layer | `NLayer` (144 neurons) | `number[144]` |
| Output layer | `NLayer` (N neurons) | `number[N]` |
| Prediction | `TrainingService.getResult()` | `string` |

The network doesn't know anything about letters yet — it starts with random weights and produces random outputs. Training is what turns the random number generator into a character recognizer. That's the subject of the next article.

---

## What's next

We have a network. It accepts 144 numbers and produces N numbers. But right now, those N numbers are meaningless noise. Part 3 covers backpropagation: how the network measures its own error and adjusts its weights to do better next time.

→ [Part 3: Backprop in the Browser](./03-training-in-the-browser.md)

Source code: [github.com/cleardatalabs/hwrjs](https://github.com/cleardatalabs/hwrjs) · Live demo: [cleardatalabs.github.io/hwrjs](https://cleardatalabs.github.io/hwrjs/)
