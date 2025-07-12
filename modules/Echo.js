import USE from "@tensorflow-models/universal-sentence-encoder"
import TF from "@tensorflow/tfjs"
import FS from "fs"

import { textClassifier } from "./types/textClassifier.js"
import { imageClassifier } from "./types/imageClassifier.js"

// enable production mode
TF.enableProdMode()

/** Echo ML Training Module */
export class Echo {
  constructor() {
    /**
     * @type {{ model: TF.LayersModel, output: any, type: 'text' | 'image' }}
     * Current model instance
     */
    this.instance = null
    /** @type {USE.UniversalSentenceEncoder} USE model */
    this.useModel = null
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
  async train(type, inputs, onProgress) {
    // switch by model type
    if (type === "text") {
      // train as text model
      return await textClassifier.train(this, inputs, {
        epochs: 35,
        batchSize: 4,
        shuffle: true,
        verbose: 1
      }, onProgress)
    } else if (type === "image") {
      // train as image model
      return await imageClassifier.train(this, inputs, {
        imageSize: 64,
        epochs: 20
      }, onProgress)
    }
  }
  /**
   * Saves model locally
   * @param {{
   *  model: TF.LayersModel
   *  output: any
   *  type: 'text' | 'image'
   * }} instance
   * Model instance
   * @param {string} path
   * Directory path to store
   */
  async save(instance, path) {
    // create directory if not available
    FS.mkdirSync(path, { recursive: true })
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
    this.instance = { model, output, type: output.type }
    // return instance
    return this.instance
  }
  /**
   * Generates output predictions
   * @param {string} input 
   * Input string
   */
  async predict(input) {
    // switch by instance type
    if (this.instance.type === "text") {
      // predict as text model
      return await textClassifier.predict(this, input)
    } else if (this.instance.type === "image") {
      // predict as image model
      return await imageClassifier.predict(this, input, 64)
    }
  }
}
