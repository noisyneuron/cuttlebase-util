# Cuttlebase data processing

This folder contains a collection of scripts used to process histology images, and created structured JSON data to be consumed by the website for the 3d brain and body.

The first part of the document provides context on all the processes carried out, and directory structure. The second part contains instructions for reprocessing data.

---

## Context
  ### 1. Histology image folder structure
  The following is the directory structure for a single orientation -- the others follow similarly. After data processing, the `full/phalloidin/cartilage` and `svgs` directories will contain images, but they start empty initially.
  The `parts` directory contains folders for all `65` brain regions. Each of these folders contains an image for each slice. The image marks out the specific region as a white area on a black background.

    .
    └── histology
        ├── horizontal
        |   ├── full              
        |   |   ├── neurotrace
        |   |   |   ├── cartilage                 # png images, transparent bg
        |   |   |   └── original                  # jpg images, black bg
        |   |   └── phalloidin
        |   |       ├── cartilage                 # empty directory initially
        |   |       ├── original                  # jpg images, black bg
        |   |       └── original_with_cartilage   # jpg images, black bg
        |   ├── parts                             
        |   |   ├── AAB                           # region marked on each layer
        |   |   ├── ADCl                          # jpg images, white-on-black
        |   |   └── ...
        |   └── svgs                              # empty directory initially
        ├── sagittal
        |   └── ...
        └── transverse
            └── ...



  ### 2. Histology image processing
  For the images, the following processes are carried out:
  1. All files are renamed sequentially, 00.* - xx.* 
  2. All images are cropped (more on this below)
  3. All images are resized
  4. All the "part" images are inverted
  5. Phalloidin cartilage images are generated using neurotrace cartilage images as a mask on the phalloidin 'original with cartilage' set
  6. Annotation SVG files are created for each slice of each orientation, by analyzing all the "parts" images of that slice (more on this below)


  ### 3. Histology image crops
  * The crop boundaries were identified manually on the browser, and data was recorded in `data/histology.json`
  * The data contains the original image dimensions, the dimensions that the image was rendered in the browser (`cssDims`) and the crop that was identified relative to the browser rendered image (`cssCrop`)
  * The data also contains `resizeFactor`, a 0 to 1 value indicating how much percentage to scale the images down by, as well as a `layerCount` for each orientation, and the `stains` names

  
  ### 4. Brain and body regions
  * This data is stored in `data/brain-hierarchy.csv` and `data/body-hierarchy.csv`
  * The files contain data on the part `name`, `abbreviation`, and `function` for each region
  * For the brain data, there is an additional field `hasSides` that specifies whether the region has a left and right side. If so, the abbreviation will be appended with `l` and `r` when needed
  * The files also contain `index` field, which uses dash-seperated syntax to specify the hierarchy of the region. This hierarchy is visible on the region menu on the website.


  ### 5. Brain and body colors
  * This data is stored in `data/brain-scene.json` and `data/body-scene.json`
  * These files were created from a dat.gui export and may contain some amount of redundant data
  * They store a mapping between a region abbreviation and a hex code 


  ### 6. Outputs
  * Empty histology folders will be populated with relevant data
  * Intermediary generated data will be stored in `temp/`
  * All data will be processed to create `output/brain-data.json` and `output/body-data.json`
  * These files contain data formatted like so:
  ```javascript
  {
    region : { ''/*<abbreviation>*/ : ''/*<full part name>*/ },
    colors: { ''/*<abbreviation>*/ : ''/*<hex code>*/ },
    hierarchy: [
      {
        name: '',//<name for menu>,
        abbreviation: '',//<region abbreviation | null>,
        hasSides: '',//<true | false | null>,
        function: '',//<region function | null>,
        checked: '',//<1 | 0 (for inital menu state)>,
        open: '',//<true | false (for inital menu state)>,
        children: '',//[ ... nested regions with same structure ....]
      }
    ],
    breadcrumbs: {
      ''/*<abbreviation>*/: {
        path: '',//<string for breadcrumb path to region>,
        function: '',//<region function>
      }
    }
  }
  ```
  * For the brain, `output/brain-data.json` contains additional fields:
  ```javascript
  {
    orientations: [
      {
        name: '' //<orientation name>,
        layerCount: -1 //<number of slices>,
        width: -1 //<image width>,
        height: -1 //<image height>
      },
      // for each orientation
    ],
    stains: [ "neurotrace", "phalloidin" ],
    resizeFactor: 0.2,//<resize factor used for crops>,
    partsInLayer: {
      ''/*<orientation name>*/: {
        ''/*<slice number>*/: [], //<list of region abbreviations that appear in slice>
      }
    },
    layersWithPart: {
      ''/*<orientation name>*/: {
        ''/*<region abbreviation>*/: [], //<list of slice numbers where region appears> 
      }
    }
  }
  ```


---


## 2. Re-processing data

**IMPORTANT**: Run these scripts from this directory, not `scripts/` to ensure bash respects paths
### The end-to-end process to process **brain** data:
1. Ensure histology images from AWS are copied over to `histology/`
2. Adjust `data/histology.json` if needed, and run `node scripts/calculate-dimensions.js`. This will output to `temp/dims.txt` and `temp/histology-core.json`
3. Run `./scripts/process-images.sh rename` to rename all histology files. (will take a few minutes)
4. Images for each orientation can be processed simultaneously. It is recommended to do the following in seperate terminal windows so one can catch any errors in the output:
`./scripts/process-images.sh horizontal`
`./scripts/process-images.sh sagittal`
`./scripts/process-images.sh transverse`
5. Process the brain data colors, abbreviations etc, by running `node scripts/process-brain.js`, which will output `temp/brain-pre-svg.json`. NOTE: This script handles certain exceptions in the data, eg. setting color for regions, hiding certain regions at the start.
6. Create the SVG files and store additional data by running `node scripts/create-svgs.js`, which will create svg files in `histology/ORIENTATION/svgs` and the final data for the website in `output/brain.json`
7. Copy over files to the website ...

### The end-to-end process to process **body** data:
1. Run `scripts/process-body.js` which will output `output/body.json`