import { Echo } from "./modules/Echo.js"
import { auth } from "./modules/auth.js"
import { createServer } from "http"
import { WebSocketServer } from "ws"
import express from "express"
import dotenv from "dotenv"
import crypto from "crypto"
import multer from "multer"
import open from "open"
import fs from "fs"

// create echo module
const echo = new Echo()

// helper to read json files
const read = path => JSON.parse(fs.readFileSync(path))
// helper to write json files
const write = (path, data) => fs.writeFileSync(path, JSON.stringify(data))
// helper to send socket data to client
const send = (client, data) => client.send(JSON.stringify(data))

// configure variables
dotenv.config()

// configure multer upload
const upload = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      // get files path
      const path = `projects/${req.query.id}/uploads`
      // create folder if not available
      fs.mkdirSync(path, { recursive: true })
      // return upload path
      cb(null, path)
    },
    filename: function (req, file, cb) {
      // return random file name
      cb(null, crypto.randomUUID().toUpperCase())
    },
  })
})

// create express app
const app = express()

// serve static content
app.use(express.static("client"))

// enable json middleware
app.use(express.json())

// create http server
const server = createServer(app)

// create web socket server
const wss = new WebSocketServer({ server })

// web socket connection
wss.on("connection", client => {
  // message listener
  client.on("message", async text => {
    // parse client message
    const data = JSON.parse(text)
    // switch by message type
    if (data.type === "train") {
      // get project path
      const path = `projects/${data.id}`
      // read project data
      const source = read(path + "/source.json")
      // map inputs by type
      const inputs = source.type === "image"
        ? source.inputs.map(input => ({
          patterns: input.patterns.map(item => (
            `projects/${source.id}/uploads/${item}`
          )),
          response: input.response
        }))
        : source.inputs
      // train model with inputs
      const instance = await echo.train(source.type, inputs, progress => {
        // progress message
        send(client, { status: "training", progress })
      })
      // saving message
      send(client, { status: "saving" })
      // store model locally
      await echo.save(instance, path + "/output")
      // update echo instance
      echo.instance = instance
      // completed message
      send(client, { status: "completed" })
    }
  })
})

// method to get all projects
app.get("/api/projects", (req, res) => {
  // return projects listing
  res.send(read("projects/library.json"))
})

// method to get project by id
app.get("/api/project", async (req, res) => {
  // get project directory
  const path = `projects/${req.query.id}`
  // load existing model
  await echo.load(`${path}/output`)
  // return project data
  res.send(read(`${path}/source.json`))
})

// method to create project
app.post("/api/project", (req, res) => {
  // create a random id
  const id = crypto.randomUUID().toUpperCase()
  // get timestamp
  const time = Date.now()
  // create project source
  const source = { id, ...req.body, date_created: time, date_updated: time }
  // create project data
  const data = {
    ...source, inputs: [],
    predictions: { data: [], _input: "" }
  }
  // create project directory
  fs.mkdirSync(`projects/${id}`)
  // save project source
  write(`projects/${id}/source.json`, data)
  // get all projects
  const projects = read("projects/library.json")
  // push into array
  projects.unshift(source)
  // save projects library
  write("projects/library.json", projects)
  // return project data
  res.send(data)
})

// method to save project
app.put("/api/project", (req, res) => {
  // get projects data
  const { id, name, type, date_created } = req.body
  // get current date
  const date_updated = Date.now()
  // get project source path
  const path = `projects/${id}/source.json`
  // save project source
  write(path, { ...req.body, date_updated })
  // get all projects
  const projects = read("projects/library.json")
  // get project index
  const index = projects.findIndex(item => item.id === id)
  // update projects library
  projects[index] = { id, name, type, date_created, date_updated }
  // save projects library
  write("projects/library.json", projects)
  // return project data
  res.send(req.body)
})

// method to delete project
app.delete("/api/project", (req, res) => {
  // get project id
  const id = req.body.id
  // get all projects
  const projects = read("projects/library.json")
  // get remaining projects
  const remaining = projects.filter(item => item.id !== id)
  // save projects library
  write("projects/library.json", remaining)
  // delete project directory
  fs.rmSync(`projects/${id}/`, { recursive: true, force: true })
  // return response
  res.send({ id })
})

// method to upload files
app.post("/api/upload", upload.array("files"), (req, res) => {
  // return uploaded file names array
  res.send(req.files.map(file => file.filename))
})

// method to expose files on projects
app.get("/api/file", (req, res) => {
  // get id parts
  const parts = req.query.id.split(".")
  // create file path
  const path = `projects/${parts[0]}/uploads/${parts[1]}`
  // return file content
  res.send(fs.readFileSync(path))
})

// method to clean project source
app.post("/api/clean", async (req, res) => {
  // get project id
  const id = req.body.id
  // get project directory
  const path = `projects/${id}`
  // get project source
  const source = read(`${path}/source.json`)
  // patterns array
  const patterns = []
  // for each input
  for (let i = 0; i < source.inputs.length; i++) {
    // current input
    const input = source.inputs[i]
    // clean input values
    input._pattern = ""
    input._response = ""
    // push to patterns
    patterns.push(...input.patterns)
  }
  // get uploads path
  const uploads = `${path}/uploads`
  // only if text classification
  if (source.type === "image" && fs.existsSync(uploads)) {
    // get files from uploads
    const files = fs.readdirSync(uploads)
    // filter unwanted files
    const unwanted = files.filter(item => !patterns.includes(item))
    // remove unwanted files
    unwanted.forEach(item => fs.rmSync(`${uploads}/${item}`))
  }
  // clean project chat history
  source.predictions.data = []
  source.predictions._input = ""
  // save project source
  write(`${path}/source.json`, source)
  // return project data
  res.send(source)
})

app.post("/api/predict", async (req, res) => {
  // get input by model type
  const input = echo.instance.type === "image"
    ? `projects/${req.body.id}/uploads/${req.body.input}`
    : req.body.input
  // return prediction result
  res.send(await echo.predict(input))
})

// constance
const PORT = process.env.PORT
const BASE = `http://localhost:${PORT}`

// display info
auth()

// start server
server.listen(PORT, () => {
  // initiate echo module
  echo.init(`${BASE}/assets/models`).then(() => {
    // print server info
    console.log(`Started: ${BASE}`)
    // open client on browser
    open(BASE)
  })
})
