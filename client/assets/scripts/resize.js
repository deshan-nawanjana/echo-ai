// resizing canvas
const canvas = document.createElement("canvas")

// helper to resize image
const resizeScript = {
  resizeImage(file) {
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
}
