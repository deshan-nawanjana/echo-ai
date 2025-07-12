// element selectors
const qs = selector => document.querySelector(selector)
const qa = selector => document.querySelectorAll(selector)

// helper to call api requests
const API = (method, url, data) => (
  // switch by method
  method === "GET"
    // send data as url params
    ? fetch("/api/" + url + "?" + new URLSearchParams(data).toString(), {
      headers: { "Content-Type": "application/json" }, method
    }).then(resp => resp.json())
    // send data as payload
    : fetch("/api/" + url, {
      headers: { "Content-Type": "application/json" }, method,
      body: JSON.stringify(data)
    }).then(resp => resp.json())
)

// create canvas and file reader
const canvas = document.createElement("canvas")
const reader = new FileReader()

// helper to resize image
function resize(file) {
  return new Promise(resolve => {
    // create image
    const img = new Image()
    // image load event
    img.addEventListener("load", () => {
      // get image width to resize
      const width = 100 * (img.width / img.height)
      // set canvas dimensions
      canvas.width = width
      canvas.height = 100
      // draw image on canvas
      canvas.getContext("2d").drawImage(img, 0, 0, width, 100)
      // create blob from canvas
      canvas.toBlob(blob => {
        // resolve canvas as
        resolve(new File([blob], file.name, {
          type: file.type,
          lastModified: Date.now()
        }))
        // revoke blob url
        URL.revokeObjectURL(img.src)
      }, file.type)
    })
    // set blob url on image
    img.src = URL.createObjectURL(file)
  })
}

// preload components by placeholders
await Promise.all(Array.from(qa("link[id]")).map(async holder => {
  // get component id
  const id = holder.getAttribute("id").replaceAll(".", "/")
  // fetch dom resource
  const html = await fetch(`components/${id}.html`)
  // fetch style resource
  const css = await fetch(`components/${id}.css`)
  // replace holder element with dom
  holder.outerHTML = await html.text()
  // create style element
  const element = document.createElement("Style")
  // set style on element
  element.innerHTML = await css.text()
  // append style on head
  document.head.appendChild(element)
}))

const responseTypes = {
  static: "Static",
  random: "Random",
  json: "JSON"
}

new Vue({
  el: "#app",
  data: {
    // app ready state
    ready: false,
    // data loading state
    loading: false,
    // project saving state
    saving: false,
    // model training state
    training: false,
    // model predicting state
    predicting: false,
    // current screen
    screen: "projects",
    // all projects
    projects: [],
    // project create popup
    create: { open: false, name: "", type: "text" },
    // project delete popup
    remove: { open: false },
    // model train alert popup
    alert: { open: false },
    // opened project
    project: null,
    // selected project on listing
    selectedProject: null,
    // selected input on editor
    selectedInput: null,
    // socket connection
    socket: null,
    // training progress
    progress: null,
    // type objects
    responseTypes
  },
  computed: {
    isChatAvailable() {
      // return if no project
      if (!this.project) { return false }
      // return if any messages from user or model
      return this.project.predictions.data.some(item => item.type !== "retrained")
    }
  },
  methods: {
    // helper to get time string
    toDateString(date) {
      // return as local date time string 
      return new Date(date).toLocaleString()
    },
    // helper to get file api url
    toFileURL(project, file) {
      // return api api url
      return `/api/file?id=${project}.${file}`
    },
    // helper to match current project id
    isCurrentProject(id) {
      return this.project && this.project.id === id
    },
    // open create project popup
    createProjectPopup() {
      // set create options
      this.create.name = ""
      this.create.type = "text"
      this.create.open = true
      // focus on input element
      setTimeout(() => this.$refs.create_input.focus(), 100)
    },
    // method to create a project
    async createProject() {
      // check name
      if (!this.create.name.trim()) {
        // focus on input
        this.$refs.create_input.focus()
      } else {
        // start loading
        this.loading = true
        // close popup
        this.create.open = false
        // request project create
        this.project = await API("POST", "project", {
          name: this.create.name.trim(),
          type: this.create.type
        })
        // reload all projects
        this.projects = await API("GET", "projects")
        // set as selected project
        this.selectedProject = this.projects.find(item => item.id === this.project.id)
        // stop loading
        this.loading = false
      }
    },
    // method to open project
    async openProject(id) {
      // start loading
      this.loading = true
      // clear selected input
      this.selectedInput = null
      // request project data
      this.project = await API("GET", "project", { id })
      // switch to editor screen
      this.screen = "editor"
      // focus on chat
      this.focusChat(100)
      // stop loading
      this.loading = false
    },
    // method to save project
    async saveProject() {
      // start loading
      this.saving = true
      // request project save
      this.project = await API("PUT", "project", this.project)
      // reload all projects
      this.projects = await API("GET", "projects")
      // stop loading
      setTimeout(() => this.saving = false, 200)
    },
    // method to delete project
    async deleteProject(id) {
      // start loading
      this.loading = true
      // close popup
      this.remove.open = false
      // request project delete
      await API("DELETE", "project", { id })
      // close project
      this.project = null
      // close selected project
      this.selectedProject = null
      // reload all projects
      this.projects = await API("GET", "projects")
      // stop loading
      this.loading = false
    },
    // method to create inputs
    createInput() {
      // create random id for input
      const id = crypto.randomUUID()
      // push object to inputs
      this.project.inputs.push({
        id,
        name: "Input #" + (this.project.inputs.length + 1),
        patterns: [],
        response: {
          type: "static",
          content: {
            static: "",
            random: [],
            json: ""
          },
          script: {
            enabled: false,
            content: ""
          }
        },
        _pattern: "",
        _response: ""
      })
      // get input data index
      const index = this.project.inputs.length - 1
      // set as selected input
      this.selectedInput = this.project.inputs[index]
      // dom update delay
      setTimeout(() => {
        // scroll into view
        qa("#inputs .item")[index].scrollIntoView({
          behavior: "smooth", block: "center"
        })
      }, 100)
    },
    // method to delete input by id
    deleteInput(id) {
      // get inputs array
      const inputs = this.project.inputs
      // remove input by id
      this.project.inputs = inputs.filter(item => item.id !== id)
      // clear selected input
      this.selectedInput = null
    },
    // method to add text pattern
    addTextPattern(event) {
      // return if not enter key
      if (event.key !== "Enter") { return }
      // get selected input
      const item = this.selectedInput
      // get pattern value
      const pattern = item._pattern.trim()
      // return if empty pattern
      if (!pattern) { return }
      // push to pattern
      item.patterns.push(pattern)
      // clear pattern input
      item._pattern = ""
    },
    // method to add image patterns
    async addImagePattern(id) {
      // upload files
      const names = await this.upload("image/png, image/jpeg")
      // find input by id
      const match = this.project.inputs.find(item => item.id === id)
      // push file names to patterns
      if (match) { match.patterns.push(...names) }
    },
    // method to delete pattern
    deletePattern(index) {
      // get selected input
      const input = this.selectedInput
      // filter other patterns
      input.patterns = input.patterns.filter((_item, i) => i !== index)
    },
    // method to add random response
    addRandomResponse(event) {
      // return if not enter key
      if (event.key !== "Enter") { return }
      // get selected input
      const item = this.selectedInput
      // get response value
      const response = item._response.trim()
      // return if empty response
      if (!response) { return }
      // push to responses
      item.response.content.random.push(response)
      // clear response input
      item._response = ""
    },
    // method to delete random response
    deleteRandomResponse(index) {
      // get selected input
      const input = this.selectedInput
      // get random responses
      const array = input.response.content.random
      // filter other responses
      input.response.content.random = array.filter((_item, i) => i !== index)
    },
    // method to tain model
    async trainModel() {
      // get inputs with patterns
      const inputs = this.project.inputs.filter(item => item.patterns.length)
      // check inputs count
      if (inputs.length < 2) {
        // show train blocked alert
        this.alert.open = true
      } else {
        // reset progress data
        this.progress = 0
        // set as training
        this.training = true
        // save project
        await this.saveProject()
        // send socket message to start training
        this.socket.send(JSON.stringify({ type: "train", id: this.project.id }))
      }
    },
    // method to predict model
    async predictModel(event) {
      // return if predicting
      if (this.predicting) { return }
      // input value
      let input = null
      // get project type
      const type = this.project.type
      // switch by type
      if (type === "text") {
        // return if not enter key
        if (event.key !== "Enter") { return }
        // get input value
        input = this.project.predictions._input.trim()
        // clear input value
        this.project.predictions._input = ""
      } else if (type === "image") {
        // upload and get image name as input
        input = (await this.upload())[0]
      }
      // return if empty input
      if (!input) { return }
      // start predicting
      this.predicting = true
      // push user message on predictions
      this.project.predictions.data.push({
        time: Date.now(),
        type: "message",
        sender: "user",
        data: input
      })
      // focus on chat
      this.focusChat()
      // request prediction response
      const data = await API("POST", "predict", { id: this.project.id, input })
      // get content by type
      const content = data.type === "random"
        ? data.content[Math.floor(Math.random() * data.content.length)]
        : data.content
      // dom update delay
      setTimeout(async () => {
        // get response by scripting
        const response = data.script
          ? Function(`return (${data.script})(${JSON.stringify(content)})`)()
          : content
        // push model response on predictions
        this.project.predictions.data.push({
          time: Date.now(),
          type: "message",
          sender: "model",
          data: response
        })
        // focus on chat
        this.focusChat()
        // save project
        await this.saveProject()
        // stop predicting
        this.predicting = false
      }, 600)
    },
    // method to upload files
    upload(accept) {
      return new Promise(resolve => {
        // create file input
        const input = document.createElement("input")
        // configure input options
        input.type = "file"
        input.multiple = true
        input.accept = accept
        // input listener
        input.addEventListener("input", async () => {
          // create form data
          const data = new FormData()
          // for each file on input
          for (const file of input.files) {
            // resize and append image
            data.append("files", await resize(file))
          }
          // request files upload
          const names = await fetch(`/api/upload?id=${this.project.id}`, {
            method: "POST",
            body: data
          }).then(resp => resp.json())
          // resolve file names
          resolve(names)
        })
        // trigger file open window
        input.click()
      })
    },
    // method to focus chat listing
    focusChat(time = 80) {
      // dom update delay
      setTimeout(() => {
        // get chat tray element
        const element = this.$refs.chat_tray
        // return if no element
        if (!element) { return }
        // scroll to the bottom
        element.scrollTop = element.scrollHeight
      }, time)
    }
  },
  async mounted() {
    // load all projects
    this.projects = await API("GET", "projects")
    // set as ready
    this.ready = true
    // initiate socket connection
    this.socket = new WebSocket("/")
    // socket message listener
    this.socket.addEventListener("message", async event => {
      // parse socket message
      const data = JSON.parse(event.data)
      // switch by status
      if (data.status === "training") {
        // update progress value
        this.progress = parseInt(data.progress)
      } else if (data.status === "completed") {
        // push retrained status message
        if (this.isChatAvailable) {
          this.project.predictions.data.push({ time: Date.now(), type: "retrained" })
        }
        // start loading
        this.loading = true
        // update last trained date
        this.project.date_trained = Date.now()
        // save project data
        await this.saveProject()
        // dom update delay
        setTimeout(() => {
          // reset training state
          this.training = false
          // stop loading
          this.loading = false
        }, 100)
      }
    })
  }
})
