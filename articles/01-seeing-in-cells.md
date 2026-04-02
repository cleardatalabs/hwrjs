# Seeing in Cells: How a Computer Reads Your Handwriting

Your browser tab is about to run a neural network that recognizes handwritten characters. No cloud API, no Python runtime, no GPU — just JavaScript, a canvas element, and a few hundred lines of arithmetic.

But before the neural network can do anything useful, it faces a deceptively hard problem: handwriting doesn't fit in a box. You draw an "A" in the top-left corner of the canvas, your friend draws the same letter twice as large and centered. Raw pixel coordinates are useless — they encode position and scale, not shape. The network needs something invariant to where and how big you drew.

This article is about how we solve that. It covers the journey from raw canvas strokes to the 144-number array that actually feeds the network. If you want to follow along in code, the full project is at [github.com/cleardatalabs/hwrjs](https://github.com/cleardatalabs/hwrjs), with a [live demo here](https://cleardatalabs.github.io/hwrjs/).

---

## The raw material: a list of (x, y) points

When you drag your mouse across the canvas, the `DrawingComponent` fires on every `mousemove` event. Each event produces a single coordinate:

```typescript
// drawing.component.ts
onMove(src: MouseEvent) {
  if (!this.isDrawing) { return; }
  const rect = this.canvasRef.nativeElement.getBoundingClientRect();
  this.draw({
    x: src.clientX - rect.left,
    y: src.clientY - rect.top
  });
}
```

The subtraction of `rect.left` / `rect.top` converts from viewport coordinates to canvas-local coordinates. Each point is pushed into `samplesService.points`, which at the end of a stroke looks something like:

```
[{x:112, y:48}, {x:114, y:51}, {x:117, y:58}, {x:120, y:68}, ...]
```

This list is the raw material. It captures every position your pen visited, in the order you visited them. It knows nothing about what letter you intended.

---

## The problem with raw coordinates

Imagine training a network on these raw (x, y) pairs. Two people draw the letter "A":

| Person | x range | y range | Number of points |
|--------|---------|---------|-----------------|
| Alice  | 100–180 | 40–140  | 87 points |
| Bob    | 220–310 | 180–290 | 143 points |

Alice drew small and in the upper-left. Bob drew large and in the center. To a model trained on Alice's coordinates, Bob's "A" looks like a completely different object — same topology, totally different numbers.

We need a representation that strips out position, scale, and stroke density, leaving only shape. The answer is a fixed-size binary grid.

---

## Step 1: find the bounding box

Before we can project the drawing onto a grid, we need to know its extent. `SamplesService.getBoundingBox()` makes a single pass over the points:

```typescript
// samples.service.ts
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
```

The bounding box is the tightest rectangle that contains every point you drew. For Alice's "A" above, it would be roughly `{minX:100, minY:40, maxX:180, maxY:140}`.

---

## Step 2: project onto a 12 × 12 grid

With the bounding box in hand, every point can be scaled to fit in a 12-cell-wide, 12-cell-tall grid — regardless of where on the canvas it was drawn or how large it is.

```typescript
// samples.service.ts
gridFromSample(sample: Sample): number[] {
  const { minX, minY, maxX, maxY } = this.getBoundingBox(sample.points);

  const gridPoints = new Array(this.sensorWidth * this.sensorHeight).fill(0);

  for (const point of sample.points) {
    const gridX = this.sensorWidth  * (point.x - minX) / (maxX - minX + 1);
    const gridY = this.sensorHeight * (point.y - minY) / (maxY - minY + 1);
    gridPoints[Math.floor(gridX) + this.sensorWidth * Math.floor(gridY)] = 1;
  }

  return gridPoints;
}
```

The formula `sensorWidth * (point.x - minX) / (maxX - minX + 1)` maps the x coordinate linearly from `[minX, maxX]` to `[0, sensorWidth)`. The `+1` prevents a division-by-zero when the drawing is a single vertical or horizontal line.

`Math.floor(gridX) + sensorWidth * Math.floor(gridY)` converts the 2D grid coordinate into a flat array index: column + 12 * row.

Every grid cell that any stroke passed through gets set to `1`. Everything else stays `0`.

---

## What the grid looks like

Here is a rough ASCII rendering of the letter "A" projected onto a 12 × 12 grid:

```
. . . . . . 1 . . . . .
. . . . . 1 . 1 . . . .
. . . . 1 . . . 1 . . .
. . . 1 . . . . . 1 . .
. . 1 . . . . . . . 1 .
. 1 1 1 1 1 1 1 1 1 1 .
1 . . . . . . . . . . 1
1 . . . . . . . . . . 1
```

Each row is 12 cells. The full grid flattens to 144 numbers, each either 0 or 1. This 144-element array is what the neural network receives as input.

---

## Why this works (and where it breaks down)

The grid representation is surprisingly capable for its simplicity. A few reasons it holds up:

- **Scale invariance**: Alice's tiny "A" and Bob's large "A" both fit the bounding box exactly, so they produce nearly the same grid.
- **Position invariance**: subtracting `minX` and `minY` recenters every drawing to the origin.
- **Fixed size**: regardless of how many points you drew, the output is always 144 numbers — a requirement for a network with a fixed number of input neurons.

The limits are equally instructive:

- **Rotation**: a tilted "A" looks like a different letter.
- **Stroke order and direction**: the grid is a spatial snapshot, not a temporal one. Two drawings with the same strokes in different orders produce identical grids.
- **Very similar letters**: an "O" and a "0" will produce nearly identical grids unless the user has a strong, consistent style.

For a handwriting demo that trains on a single user's samples and recognizes that same user's characters, these limitations don't matter much in practice. The grid is good enough — and simple enough to understand completely.

---

## The path to 144 numbers

Let's summarize the full pipeline:

1. User draws on canvas → `DrawingComponent` collects `Point[]` on each `mousemove`
2. User clicks "Add" → `SamplesService.addSample()` stores the `{letter, points}` pair
3. When building training data → `gridFromSample()` calls `getBoundingBox()`, then projects each point into a 12×12 binary grid
4. Result: `number[]` of length 144, containing only `0` and `1`

The network never sees raw pixel coordinates. It sees a normalized, scale-invariant, fixed-size representation of the shape — which is the only thing it needs.

---

## What's next

We now have 144 numbers. The question is: what do we do with them? The next article walks through the neural network itself — the sigmoid neuron, how layers are composed, and how the network transforms 144 inputs into a single predicted character.

→ [Part 2: 144 Numbers In, One Letter Out](./02-neurons-in-code.md)

Source code: [github.com/cleardatalabs/hwrjs](https://github.com/cleardatalabs/hwrjs) · Live demo: [cleardatalabs.github.io/hwrjs](https://cleardatalabs.github.io/hwrjs/)
