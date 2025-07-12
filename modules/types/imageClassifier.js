import CNV from "canvas"
import TF from "@tensorflow/tfjs"
import { Echo } from "../Echo.js"

/** Default configuration */
const defaultConfig = {
  imageSize: 64,
  epochs: 20
}

/** Echo Image Classification Module */
export const imageClassifier = {
  /**
   * Trains a model
   * @param {Echo} module
   * Echo module
   * @param {{ patterns: string[], response: any }[]} inputs
   * Training data inputs
   * @param {defaultConfig} config
   * Training configuration
   * @param {(number) => void} onProgress
   * Epoch end callback
   */
  async train(module, inputs, config = defaultConfig, onProgress) {
    // images array
    const images = []
    // intents array
    const intents = []
    // responses array
    const responses = []
    // for each input
    for (let i = 0; i < inputs.length; i++) {
      // current input
      const input = inputs[i]
      // for each pattern
      for (let p = 0; p < input.patterns.length; p++) {
        // push tensor image into images
        images.push(await this.toTensorImage(input.patterns[p], config.imageSize))
        // push index to intents
        intents.push(i)
      }
      // push to responses
      responses.push({
        type: input.response.type,
        content: input.response.content[input.response.type],
        script: input.response.script.enabled
          ? input.response.script.content
          : null
      })
    }
    // generate training data
    const xs = TF.stack(images)
    // generate response data
    const ys = TF.oneHot(TF.tensor1d(intents, 'int32'), inputs.length)
    // create a model
    const model = TF.sequential()
    // add layers to model
    model.add(TF.layers.conv2d({
      inputShape: [config.imageSize, config.imageSize, 3],
      filters: 16,
      kernelSize: 3,
      activation: 'relu'
    }))
    model.add(TF.layers.maxPooling2d({ poolSize: 2 }))
    model.add(TF.layers.flatten())
    model.add(TF.layers.dense({ units: 64, activation: 'relu' }))
    model.add(TF.layers.dense({ units: inputs.length, activation: 'softmax' }))
    // compile model
    model.compile({
      optimizer: 'adam',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    })
    // train model
    await model.fit(xs, ys, {
      epochs: config.epochs,
      callbacks: {
        onEpochEnd: epoch => {
          onProgress(100 * (epoch + 1) / config.epochs)
        }
      }
    })
    // create output object
    const output = { type: "image", responses }
    // return model and output
    return { model, output, type: "image" }
  },
  /**
   * Generates output predictions
   * @param {Echo} module
   * Echo module
   * @param {string} path 
   * Image file path
   * @param {number} size 
   * Size of image
   */
  async predict(module, path, size) {
    // generate tenor image from path
    const tensor = await this.toTensorImage(path, size)
    // get batch batch dimension input
    const input = TF.expandDims(tensor, 0)
    // get model prediction for the input
    const prediction = module.instance.model.predict(input)
    // get intent index from prediction
    const intent = prediction.argMax(1).dataSync()[0]
    // return response by intent
    return module.instance.output.responses[intent]
  },
  /**
   * Loads and convert to tensor image
   * @param {string} path
   * Image file path
   * @param {number} size
   * Image size
   */
  async toTensorImage(path, size) {
    // load image by path
    const image = await CNV.loadImage(path)
    // create canvas by required size
    const canvas = CNV.createCanvas(size, size)
    // get canvas context
    const context = canvas.getContext('2d')
    // draw image on canvas context
    context.drawImage(image, 0, 0, size, size)
    // return tensor image
    return TF.browser.fromPixels(canvas).toFloat().div(TF.scalar(255))
  }
}
