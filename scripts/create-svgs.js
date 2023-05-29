const fs = require('fs')
const path = require('path')
const potrace = require('potrace')
const brainData = require('../temp/brain-pre-svg.json')
const outputFile = path.resolve(__dirname, '../output/brain.json')

const paths = {
  histologyRoot: path.resolve(__dirname, '../histology'),
  partsRoot: 'parts',
  svgRoot: 'svgs',
  dimensionsImg: 'parts/AAB/00.jpg'
}

const layerData = {
  partsInLayer: {},
  layersWithPart: {},
  svgs: {}
}


function initializeLayerData() {
  brainData.orientations.forEach(orientation => {
    layerData.partsInLayer[orientation.name] = {}
    layerData.layersWithPart[orientation.name] = {}
    layerData.svgs[orientation.name] = {}

    for (let i = 0; i < orientation.layerCount; i++) {
      layerData.partsInLayer[orientation.name][i] = []
      layerData.svgs[orientation.name][i] = null
    }

    for (let region in brainData.regions) {
      layerData.layersWithPart[orientation.name][region] = []
    }
  })
}

function loadImage(trace, path) {
  return new Promise((resolve, reject) => {
    trace.loadImage(path, (err) => {
      if (err) reject(err)
      resolve()
    })
  })
}

async function populateDimensions() {
  for (const orientation of brainData.orientations) {
    const path = `${paths.histologyRoot}/${orientation.name}/${paths.dimensionsImg}`
    const trace = new potrace.Potrace()
    await loadImage(trace, path)
    orientation.width = trace._luminanceData.width
    orientation.height = trace._luminanceData.height
  }
}

async function getSVGPath(orientation, part, layer) {
  const fileName = String(layer).padStart(2, '0')
  const filePath = `${paths.histologyRoot}/${orientation.name}/${paths.partsRoot}/${part}/${fileName}.jpg`
  // console.log(`PROCESSING: ${filePath}`)
  if (fs.existsSync(filePath)) {
    const trace = new potrace.Potrace()
    await loadImage(trace, filePath)
    return trace.getPathTag()
  } else {
    // console.log(`NO FILE: for ${orientation.name} > ${part} > ${fileName}`)
    return false
  }
}

async function processSVGForLayer(orientation, layer) {
  const allPaths = []
  for (const region in brainData.regions) {
    let svgPath = await getSVGPath(orientation, region, layer)
    if (svgPath) {
      // part exists
      if (svgPath.indexOf(`d=""`) === -1) {
        // console.log(`FOUND PATH: for ${orientation.name} > ${region} > ${layer}`)
        svgPath = svgPath
          .replace('path', `path class="svg-region-${region}"`)
          .replace('fill="black"', `fill="${brainData.colors[region]}" fill-opacity="0.2"`)
          .replace('stroke="none"', `stroke="${brainData.colors[region]}"`)
        layerData.partsInLayer[orientation.name][layer].push(region)
        layerData.layersWithPart[orientation.name][region].push(layer)
        allPaths.push(svgPath)
      } else {
        console.log(`EMPTY: ${orientation.name} -> ${region} -> Layer ${layer}`)
      }
    }
  }

  // if(allPaths.length > 0) {
  const fullSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${orientation.width}" height="${orientation.height}" viewBox="0 0 ${orientation.width} ${orientation.height}" version="1.1">
    ${allPaths.join('')}
    </svg>
  `.trim()
  layerData.svgs[orientation.name][layer] = fullSVG
  // } 
  console.log(`>>> ${orientation.name} layer ${layer} contains ${allPaths.length} parts <<<<`)
}

function saveFiles() {
  for (const orientation in layerData.svgs) {
    if (!fs.existsSync(`${paths.histologyRoot}/${orientation}/${paths.svgRoot}`)) {
      fs.mkdirSync(`${paths.histologyRoot}/${orientation}/${paths.svgRoot}`);
    }
    for (const layer in layerData.svgs[orientation]) {
      const svgContents = layerData.svgs[orientation][layer]
      // if (svgContents !== null) {
      const fileName = String(layer).padStart(2, '0')
      const filePath = `${paths.histologyRoot}/${orientation}/${paths.svgRoot}/${fileName}.svg`
      fs.writeFile(filePath, svgContents, (err) => {
        if (err) {
          console.log(err, filePath)
        } else {
          console.log(`SAVED: ${filePath}`)
        }
      })
      // }
    }
  }
  const allBrainData = {
    ...brainData,
    partsInLayer: layerData.partsInLayer,
    layersWithPart: layerData.layersWithPart,
    stains: [
      "neurotrace",
      "phalloidin"
    ],
    totalImageCount: 656,
    resizeFactor: 0.4
  }
  fs.writeFile(outputFile, JSON.stringify(allBrainData), (err) => {
    if (err) {
      console.log(err)
    } else {
      console.log(`~~~~ SAVED ALL BRAIN DATA JSON ~~~~`)
    }
  })
}

async function main() {
  initializeLayerData()
  // console.log(layerData)

  await populateDimensions()
  // console.log(orientations)

  for (const orientation of brainData.orientations) {
    console.log(`Processing ${orientation.name} layers...`)
    for (let i = 0; i < orientation.layerCount; i++) {
      await processSVGForLayer(orientation, i)
    }
  }

  saveFiles()
}

main()


