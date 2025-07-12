import TF from "@tensorflow/tfjs"
import { Echo } from "../Echo.js"

/** Default configuration */
const defaultConfig = {
  epochs: 35,
  batchSize: 4,
  shuffle: true,
  verbose: 1
}

/** Echo Text Classification Module */
export const textClassifier = {
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
    // get use model
    const useModel = module.useModel
    // return if use not loaded
    if (!useModel) { return null }
    // training data array
    const data = []
    // intents array
    const intents = []
    // responses array
    const responses = []
    // for each input
    for (let i = 0; i < inputs.length; i++) {
      // current input
      const input = inputs[i]
      // push patterns to training data
      data.push(...input.patterns.map(text => ({ text, intent: i })))
      // push to intents
      intents.push(i)
      // push to responses
      responses.push({
        type: input.response.type,
        content: input.response.content[input.response.type],
        script: input.response.script.enabled
          ? input.response.script.content
          : null
      })
    }
    // create vectorized intent map
    const intentMap = data.map(item => (
      // map intents by positions
      intents.map(intent => item.intent === intent ? 1 : 0)
    ))
    // generate training data
    const xs = await useModel.embed(data.map(item => item.text))
    // generate response data
    const ys = TF.tensor2d(intentMap)
    // create a model
    const model = TF.sequential()
    // add vocabulary layer instance
    model.add(TF.layers.dense({
      inputShape: [512],
      units: 128,
      activation: 'relu'
    }))
    // add intents layer instance
    model.add(TF.layers.dense({
      units: intents.length,
      activation: 'softmax'
    }))
    // compile model
    model.compile({
      loss: 'categoricalCrossentropy',
      optimizer: 'adam',
      metrics: ['accuracy']
    })
    // train model
    await model.fit(xs, ys, {
      ...defaultConfig,
      callbacks: {
        onEpochEnd: epoch => {
          onProgress(100 * (epoch + 1) / config.epochs)
        }
      }
    })
    // create output object
    const output = { type: "text", responses }
    // return model and output
    return { model, output, type: "text" }
  },
  /**
   * Generates output predictions
   * @param {Echo} module
   * Echo module
   * @param {string} input 
   * Input string
   */
  async predict(module, input) {
    // created embedded array from input
    const embedded = await module.useModel.embed([input])
    // get model prediction for the input
    const prediction = module.instance.model.predict(embedded)
    // get intent index from prediction
    const intent = prediction.argMax(1).dataSync()[0]
    // return response by intent
    return module.instance.output.responses[intent]
  }
}
