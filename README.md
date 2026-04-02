# HwrJs

Neural network based handwritten character recognition demo built in TypeScript (Angular 19).
Runs entirely in the browser — no backend, no third-party API calls, no ML frameworks.

**Try it online:** https://cleardatalabs.github.io/hwrjs/

![usage animation](https://cleardatalabs.github.io/hwrjs/usage.gif)

---

## Usage

1. Draw any character on the canvas
2. Type what it is in the input field and click **Add**
3. Repeat — add multiple characters and multiple samples of each
4. Click **[ train ]** to start training; click **[ stop ]** after several iterations
5. Draw a character and click **[ check ]** to recognize it

---

## How it works

The model is a 3-layer perceptron (144 inputs → 144 hidden → N outputs) trained with
backpropagation and gradient descent. All computation runs in the browser's main thread.

Input encoding: each drawing is normalized to a 12×12 binary grid (144 cells) via bounding-box
scaling, making the representation invariant to position and scale.

A series of articles walks through the implementation in detail:

1. [Seeing in Cells](./articles/01-seeing-in-cells.md) — input encoding, bounding-box normalization
2. [144 Numbers In, One Letter Out](./articles/02-neurons-in-code.md) — neuron, layer, network topology
3. [Backprop in the Browser](./articles/03-training-in-the-browser.md) — gradient descent, training loop, UI synchronization

---

## Tech stack

| | |
|---|---|
| Framework | Angular 19 (standalone components) |
| Language | TypeScript 5.6 |
| Build | Angular CLI / esbuild |
| Neural network | Custom implementation, no ML libraries |
| Reactive | RxJS 7 |

---

## Quick start

**Prerequisites:** Node.js 20+ and npm 10+

```bash
git clone https://github.com/cleardatalabs/hwrjs.git
cd hwrjs
npm install
npx ng serve --open
```

The dev server starts at `http://localhost:4200/`.

---

## Project structure

```
src/app/
  domain/          # Core neural network (NNet, NLayer, NNeuron) and data interfaces
  services/        # SamplesService (input encoding) · TrainingService (training loop)
  drawing/         # Canvas component — user draws here
  training/        # Training controls and MSE display
articles/          # Three technical articles on the implementation
docs/              # Built static site — served via GitHub Pages
```

---

## Updating the live demo

The `docs/` directory is the GitHub Pages source. To rebuild it after making code changes:

```bash
# 1. Build a production bundle directly into docs/
npm run build:docs

# 2. The build outputs to docs/browser/ — move files to docs/ root:
cp docs/browser/* docs/
rm -rf docs/browser docs/prerendered-routes.json

# 3. Restore the usage gif (not managed by the build):
#    (only needed if it was overwritten — check with: ls docs/usage.gif)

# 4. Commit and push — GitHub Pages serves from docs/ on master
git add docs/
git commit -m "update demo build"
git push
```

> The `docs/usage.gif` file is a static asset not part of the Angular build pipeline.
> Back it up before running `build:docs` if you're unsure, or restore from git after.

---

## Support

Project is free and non-commercial. Feedback matters:
- Open an issue or submit a pull request
- Give the project a star on GitHub
