# Handwritten digit model

`digit-model.js` is a compact 784-64-10 neural network used only to classify
handwritten digits from 0 through 9. It was trained for this project on the
[MNIST dataset distributed by TensorFlow/Keras](https://storage.googleapis.com/tensorflow/tf-keras-datasets/mnist.npz).

- Input: a centered 28x28 grayscale image with white ink on black
- Output: probabilities for digits 0-9
- Held-out MNIST test accuracy: 97.36%
- Runtime: plain browser JavaScript; no image or handwriting data leaves the device

Mathematical operators are recognized separately from pen-stroke geometry.
Tesseract remains only as a fallback for ambiguous or complex symbols.
