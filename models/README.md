# Handwritten digit model

`digit-model.js` is a compact 784-128-10 neural network used only to classify
handwritten digits from 0 through 9. It was trained for this project on the
[MNIST dataset distributed by TensorFlow/Keras](https://storage.googleapis.com/tensorflow/tf-keras-datasets/mnist.npz).
The training set also includes augmented, tightly cropped scratchpad samples
from handwriting regression cases reported during development. Original
screenshots and training data are not shipped with the website.

- Input: a centered 28x28 grayscale image with white ink on black
- Output: probabilities for digits 0-9
- Held-out MNIST test accuracy: 97.89%
- Handwriting regression set: 26/26 glyphs
- Runtime: plain browser JavaScript; no image or handwriting data leaves the device

Mathematical operators are recognized separately from pen-stroke geometry.
Tesseract remains only as a fallback for ambiguous or complex symbols.
