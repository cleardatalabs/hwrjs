# HwrJs
Neural network based handwritten character recognition demo application made in JavaScript (Angular).
Try Online: https://cleardatalabs.github.io/hwrjs/ 

# Usage
1. Draw any char, type what it is and add it to the learn list 
2. Repeat to add more chars and more samples of same chars
3. Create and train neural model by clicking [train], after several iterations [stop] the training
4. Draw any char and click [check] to get it recognized

# How it works
All the magic happens in frontend, no backend interactions or 3-rd party api calls.
3 layer perceptron with backpropagation learning algorithm is currently used as a model.

# Quick start
Pre-requisites: nodejs & npm
```
git clone https://github.com/cleardatalabs/hwrjs.git
cd hwrjs
npm install
ng serve --open
```

