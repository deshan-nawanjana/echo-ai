const preloadScript = {
  async preload() {
    // get all elements
    const elements = document.querySelectorAll("link[id]")
    // preload components by placeholders
    await Promise.all(Array.from(elements).map(async holder => {
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
  }
}
