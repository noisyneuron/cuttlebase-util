const fs = require('fs')
const path = require('path')
const csvtojson = require('csvtojson')
const rawColorData = require('../data/brain-scene.json')
const { orientations, stains, resizeFactor,} = require('../temp/histology-core.json')
const hierarchyFile = path.resolve(__dirname, '../data/brain-hierarchy.csv')
const outputFile = path.resolve(__dirname, '../temp/brain-pre-svg.json')


const hierarchyRoot = [{
  name: 'All regions',
  abbreviation: null,
  hasSides: null,
  funtion: null,
  checked: 1,
  open: true,
  children: null,
}]


async function main() {

  const rawHierarchyJson = await csvtojson().fromFile(hierarchyFile)
  const regions = {}
  const colors = {}
  const breadcrumbs = {}


  const cleanHierarchyJson = () => {
    rawHierarchyJson.forEach(line => {
      for (let key in line) {
        line[key] = line[key].trim()
        if (key === 'hasSides') {
          line[key] = line[key] === 'Y'
        } else {
          if (line[key] === '') {
            line[key] = null
          }
        }
      }
    })
  }

  const populateRegions = () => {
    rawHierarchyJson.forEach(element => {
      if (element.abbreviation !== null) {
        if (element.hasSides) {
          const name = element.name.slice(0, -1)
          regions[`${element.abbreviation}l`] = `${name} (left)`
          regions[`${element.abbreviation}r`] = `${name} (right)`
        } else {
          regions[`${element.abbreviation}`] = `${element.name}`
        }
      }
    })
  }

  const populateColors = () => {
    const colorData = rawColorData.params.colors
    colorData.forEach(element => {
      if (!(element.name in regions)) {
        console.log(`${element.name} is in color data but not in abbreviations`)
      }
      colors[element.name] = element.color
    })
    // SB does not exist on 3d model
    colors['SB'] = '#d2e400'
  }

  const populateRootHierarchyChildren = () => {
    const partsHierarchy = []

    for (let part of rawHierarchyJson) {
      const indices = part.index.split('-')
      const el = {
        name: part.name,
        abbreviation: part.abbreviation,
        hasSides: part.hasSides,
        function: part.function,
        checked: 1,
        open: true,
        children: [],
      }
      let currentLevel = partsHierarchy
      for (let i of indices) {
        if (currentLevel[i]) {
          currentLevel = currentLevel[i].children
        } else {
          currentLevel.push(el)
        }
      }
    }
    hierarchyRoot[0].children = partsHierarchy
  }

  const populateBreadcrumbs = (nodes, path) => {
    nodes.forEach(node => {
      if (node.abbreviation) {
        const parts = node.hasSides ? [`${node.abbreviation}l`, `${node.abbreviation}r`] : [`${node.abbreviation}`]
        parts.forEach(part => {
          const newPath = path.slice()
          newPath.push(node.name)
          breadcrumbs[part] = {
            path: newPath.join(' > '),
            function: node.function
          }
        })
      } else {
        const newPath = path.slice()
        newPath.push(node.name)
        populateBreadcrumbs(node.children, newPath)
      }
    })
  }

  const savePreSVGFile = () => {
    const preSVGjson = {
      regions,
      colors,
      hierarchy: hierarchyRoot,
      breadcrumbs,
      orientations,
      stains,
      resizeFactor,
    }
    fs.writeFileSync(outputFile, JSON.stringify(preSVGjson))
  }

  cleanHierarchyJson()
  // console.log(rawHierarchyJson)
  populateRegions()
  // console.log(regions)
  populateColors()
  // console.log(colors)
  populateRootHierarchyChildren()
  // console.log(hierarchyRoot)
  populateBreadcrumbs(hierarchyRoot[0].children, [])
  // console.log(breadcrumbs)
  savePreSVGFile()
}

main()
