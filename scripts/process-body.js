const fs = require('fs')
const path = require('path')
const csvtojson = require('csvtojson')
const rawColorData = require('../data/body-scene.json')
const hierarchyFile = path.resolve(__dirname, '../data/body-hierarchy.csv')
const outputFile = path.resolve(__dirname, '../output/body.json')

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
        if (line[key] === '') {
          line[key] = null
        }
      }
    })
  }

  const populateRegions = () => {
    rawHierarchyJson.forEach(element => {
      if (element.abbreviation !== null) {
        regions[`${element.abbreviation}`] = `${element.name}`
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
  }

  const populateRootHierarchyChildren = () => {
    const partsHierarchy = []

    for (let part of rawHierarchyJson) {
      const indices = part.index.split('-')
      const el = {
        name: part.name,
        abbreviation: part.abbreviation,
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
        const parts = [`${node.abbreviation}`]
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

  const saveFile = () => {
    const preSVGjson = {
      regions,
      colors,
      hierarchy: hierarchyRoot,
      breadcrumbs,
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
  saveFile()
}

main()
