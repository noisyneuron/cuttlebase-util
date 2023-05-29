#!/bin/bash

source temp/dims.txt

HISTOLOGY_ROOT=histology
SAGITTAL_ROOT=${HISTOLOGY_ROOT}/sagittal
TRANSVERSE_ROOT=${HISTOLOGY_ROOT}/transverse
HORIZONTAL_ROOT=${HISTOLOGY_ROOT}/horizontal
PARTS_ROOT=parts

## MASK ON __RESIZED IMAGES__
MASK_SRC="full/phalloidin/original_with_cartilage" 
MASK_ALPHA="full/neurotrace/cartilage"
MASK_DEST="full/phalloidin/cartilage"


# ~~~~~~~~~~~~~~ RENAME ~~~~~~~~~~~~~~ 
function private-sequential-file-rename() {
    a=0  
    echo "Starting rename at ${1}"
    for file in "$1"/*
    do
        if [ ! -d "${file}" ] ; then
            echo "OLD: ${file} is a file"
            path=${file%/*}
            ext=${file##*.}
            newfile=$(printf "%02d.${ext}" "$a") #02 pad to length of 2
            newpath="${path}/${newfile}"
            echo "NEW: ${newpath}"
            mv "$file" "$newpath"
            echo "----"
            let a=a+1
        else
            echo "---entering recursion with: ${file}"
            private-sequential-file-rename "${file}"
        fi
    done
}

function rename() {
    private-sequential-file-rename ${HISTOLOGY_ROOT}
}



# ~~~~~~~~~~~~~~ CROP ~~~~~~~~~~~~~~
# width, height, x (left), y (top)
function private-crop-orientation() {
    
    if ls $1/*.jpg &>/dev/null || ls $1/*.png &>/dev/null
    then
        echo "${1} has files, cropping...."
        time mogrify -crop $2x$3+$4+$5 $1/*.*
    elif ls -ld $1/*/ &>/dev/null
    then
        echo "${1} has subdirectories"
        for folder in "$1"/*
        do
            private-crop-orientation "${folder}" $2 $3 $4 $5
        done
    fi
}

function cropSagittal() {
    private-crop-orientation ${SAGITTAL_ROOT} $sagittalCropDims
}

function cropTransverse() {
    private-crop-orientation ${TRANSVERSE_ROOT} $transverseCropDims
}

function cropHorizontal() {
    private-crop-orientation ${HORIZONTAL_ROOT} $horizontalCropDims
}



# ~~~~~~~~~~~~~~ RESIZE ~~~~~~~~~~~~~~
function private-resize-orientation() {
    
    if ls $1/*.jpg &>/dev/null || ls $1/*.png &>/dev/null
    then
        echo "${1} has files, resizing...."
        time mogrify -filter Triangle -define filter:support=2 -thumbnail $2 -unsharp 0.25x0.25+8+0.065 -dither None -posterize 136 -quality 82 -define jpeg:fancy-upsampling=off -define png:compression-filter=5 -define png:compression-level=9 -define png:compression-strategy=1 -define png:exclude-chunk=all -interlace none -colorspace sRGB -strip $1/*.*
    elif ls -ld $1/*/ &>/dev/null
    then
        echo "${1} has subdirectories"
        for folder in "$1"/*
        do
            private-resize-orientation "${folder}" $2
        done
    fi
}

function resizeSagittal() {
    private-resize-orientation ${SAGITTAL_ROOT} $sagittalResizeDims
}

function resizeTransverse() {
    private-resize-orientation ${TRANSVERSE_ROOT} $transverseResizeDims
}

function resizeHorizontal() {
    private-resize-orientation ${HORIZONTAL_ROOT} $horizontalResizeDims
}



# ~~~~~~~~~~~~~~ INVERT ~~~~~~~~~~~~~~ 
## INVERT ON __RESIZED IMAGES__
function private-invert-part-images() {
    echo "INVERT_PATH = $1"
    for part in $1/*
    do
        echo $part
        for image in ${part}/*.jpg
        do
            echo $image
            time mogrify -negate -channel RGB "$image"
        done
    done
}

function invertSagittal() {
    private-invert-part-images ${SAGITTAL_ROOT}/${PARTS_ROOT}
}

function invertTransverse() {
    private-invert-part-images ${TRANSVERSE_ROOT}/${PARTS_ROOT}
}

function invertHorizontal() {
    private-invert-part-images ${HORIZONTAL_ROOT}/${PARTS_ROOT}
}



# ~~~~~~~~~~~~~~ MASK ~~~~~~~~~~~~~~ 
function private-make-masks() {
    echo $1/${MASK_SRC} $1/${MASK_ALPHA} $1/${MASK_DEST}
    for baseImg in $1/${MASK_SRC}/*
    do
        echo "BASE: $baseImg"
        file=${baseImg##*/}
        jpgName=${file%.jpg}
        maskImg=$1/${MASK_ALPHA}/${jpgName}.png
        resultImg=$1/${MASK_DEST}/${jpgName}.png
        echo "MASK: ${maskImg}"
        echo "RESULT: ${resultImg}"
        time convert $baseImg  ${maskImg}  -compose copy_opacity -composite ${resultImg}
        echo "----"
    done
}

function maskSagittal() {
    private-make-masks ${SAGITTAL_ROOT}
}

function maskTransverse() {
    private-make-masks ${TRANSVERSE_ROOT}
}

function maskHorizontal() {
    private-make-masks ${HORIZONTAL_ROOT}
}



# ~~~~~~~~~~~~~~ ALL ~~~~~~~~~~~~~~ 

# April 2023: Masking commented out since only svgs need to be recomputed
function horizontal() {
  cropHorizontal && resizeHorizontal && invertHorizontal #&& maskHorizontal
}

function sagittal() {
  cropSagittal && resizeSagittal && invertSagittal #&& maskSagittal
}

function transverse() {
  cropTransverse && resizeTransverse && invertTransverse #&& maskTransverse
}




# ~~~~~~~~~~~~~~ ANNOTATE HIRES ~~~~~~~~~~~~~~
# THIS IS SEPERATE PROCESS FROM THE REST OF THE BATCH PROCESSING. TO RUN THIS, ENSURE YOU HAVE HIRES IMAGES,
# AND GENERATED SVGS ALREADY (RECREATE THE FOLDERS AS NEEDED). BE SURE TO RENAME SEQUENTIALLY BEFORE RUNNING THIS
# 
# Transverse might be in the wrong colorspace (gray instead of rgb).
# To fix, run this in the transverse neurotrace and phalloidin folders:
# mogrify -colorspace rgb -type TrueColor *.jpg
function private-annotate() {
    echo +$5+$6
    for img in $1/*
    do
        echo $img
        file=${img##*/}
        imgName=${file%.jpg}
        svg=$2/svgs/$imgName.svg
        echo $svg
        convert $img -background none \( $svg -resize $3x$4 \) -gravity northwest -composite $img
    done
}

function annotateSagittal() {
    private-annotate ${SAGITTAL_ROOT}/full/neurotrace/original ${SAGITTAL_ROOT} $sagittalCropDims
    private-annotate ${SAGITTAL_ROOT}/full/phalloidin/original ${SAGITTAL_ROOT} $sagittalCropDims
}

function annotateTransverse() {
    private-annotate ${TRANSVERSE_ROOT}/full/neurotrace/original ${TRANSVERSE_ROOT} $transverseCropDims
    private-annotate ${TRANSVERSE_ROOT}/full/phalloidin/original ${TRANSVERSE_ROOT} $transverseCropDims
}

function annotateHorizontal() {
    private-annotate ${HORIZONTAL_ROOT}/full/neurotrace/original ${HORIZONTAL_ROOT} $horizontalCropDims
    private-annotate ${HORIZONTAL_ROOT}/full/phalloidin/original ${HORIZONTAL_ROOT} $horizontalCropDims
}



"$@"