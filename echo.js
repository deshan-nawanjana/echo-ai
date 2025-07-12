import USE from "@tensorflow-models/universal-sentence-encoder"
import TF from "@tensorflow/tfjs"
import FS from "fs"

// enable production mode
TF.enableProdMode()

/** Echo ML Training Module */
export class Echo {
  constructor() {
    /**
     * @type {USE.UniversalSentenceEncoder}
     * USE model */
    this.useModel = null
    /**
     * @type {{ model: TF.LayersModel, output: any }}
     * Current model instance
     */
    this.instance = null
  }
  /**
   * Initializes the resources
   * @param {string} baseURL
   * Network directory to load USE model
   */
  async init(baseURL) {
    // load use model
    this.useModel = await USE.load({
      modelUrl: `${baseURL}/model.json`,
      vocabUrl: `${baseURL}/vocab.json`
    })
  }
  /**
   * Trains a model
   * @param {{ patterns: string[], response: any }[]} inputs
   * Training data inputs
   * @param {'text' | 'image'} type
   * Model type
   * @param {(number) => void} onProgress
   * Epoch end callback
   */
  async train(inputs, type, onProgress) {
    // get use model
    const useModel = this.useModel
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
      // push to responses
      responses.push({
        type: input.response.type,
        content: input.response.content[input.response.type],
        script: input.response.script.enabled
          ? input.response.script.content
          : null
      })
      // push to intents
      intents.push(i)
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
      epochs: 35,
      batchSize: 4,
      shuffle: true,
      verbose: 1,
      callbacks: {
        onEpochEnd: epoch => {
          onProgress(100 * (epoch + 1) / 35)
        }
      }
    })
    // create output object
    const output = { type, responses }
    // return model and output
    return { model, output }
  }
  /**
   * Saves model locally
   * @param {{
   *  model: TF.LayersModel
   *  output: any
   * }} instance
   * Model instance
   * @param {string} path
   * Directory path to store
   */
  async save(instance, path) {
    // create directory if not available
    if (!FS.existsSync(path)) {
      FS.mkdirSync(path, { recursive: true })
    }
    // create save handler
    const handler = TF.io.withSaveHandler(artifacts => artifacts)
    // generate model artifacts
    const artifacts = await instance.model.save(handler)
    // get weight data and output data
    const weightData = Buffer.from(artifacts.weightData)
    const outputData = JSON.stringify(instance.output)
    // save model configuration
    FS.writeFileSync(`${path}/model.json`, JSON.stringify({
      modelTopology: artifacts.modelTopology,
      format: artifacts.format,
      generatedBy: artifacts.generatedBy,
      convertedBy: artifacts.convertedBy,
      weightsManifest: [{
        paths: ["weights.bin"],
        weights: artifacts.weightSpecs,
      }]
    }))
    // save weight data and output
    FS.writeFileSync(`${path}/weights.bin`, weightData)
    FS.writeFileSync(`${path}/output.json`, outputData)
  }
  /**
   * Loads locally existing model
   * @param {string} path 
   * Directory path to load
   */
  async load(path) {
    // get resource paths
    const paths = [
      `${path}/model.json`,
      `${path}/weights.bin`,
      `${path}/output.json`
    ]
    // return if missing files
    if (paths.some(item => !FS.existsSync(item))) { return null }
    // load resource contents
    const data = paths.map(path => FS.readFileSync(path))
    // parse file contests
    const modelData = JSON.parse(data[0])
    const weightData = data[1]
    const output = JSON.parse(data[2])
    // get required content components
    const modelTopology = modelData.modelTopology
    const weightSpecs = modelData.weightsManifest[0].weights
    // load model
    const model = await TF.loadLayersModel(TF.io.fromMemory({
      modelTopology,
      weightSpecs,
      weightData
    }))
    // store as current instance
    this.instance = { model, output }
    // return instance
    return this.instance
  }
  /**
   * Generates output predictions
   * @param {string} input 
   * Input string
   */
  async predict(input) {
    // created embedded array from input
    const embedded = await this.useModel.embed([input])
    // get model prediction for the input
    const prediction = this.instance.model.predict(embedded)
    // get intent index from prediction
    const intent = prediction.argMax(1).dataSync()[0]
    // return response by intent
    return this.instance.output.responses[intent]
  }
}
