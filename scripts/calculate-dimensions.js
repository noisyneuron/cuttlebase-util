const fs = require('fs')
const path = require('path')
const { orientations, stains, resizeFactor } = require('../data/histology.json')

const outputData = {
  orientations: [],
  stains,
  resizeFactor,
}
let outputString = ''

orientations.forEach( orientation => {
  const scaleFactor = 0.5 * (
    (orientation.width / orientation.cssDims.width) +
    (orientation.height / orientation.cssDims.height)
  )

  const crop = {
    width: scaleFactor * orientation.cssCrop.width,
    height: scaleFactor * orientation.cssCrop.height,
    left: scaleFactor * orientation.cssCrop.left,
    top: scaleFactor * orientation.cssCrop.top,
  }

  const resizeDims = {
    width: Math.round(crop.width * resizeFactor),
    height: Math.round(crop.height * resizeFactor),
  }

  outputString += `
    ${orientation.name}CropDims="${Math.round(crop.width)} ${Math.round(crop.height)} ${Math.round(crop.left)} ${Math.round(crop.top)}"
    ${orientation.name}ResizeDims="${resizeDims.width}"
  `

  outputData.orientations.push({
    name: orientation.name,
    layerCount: orientation.layerCount,
    width: resizeDims.width,
    height: resizeDims.height
  })

})

console.log(outputData)

fs.writeFileSync(path.resolve(__dirname, '../temp/dims.txt'), outputString)
fs.writeFileSync(path.resolve(__dirname, '../temp/histology-core.json'), JSON.stringify(outputData))