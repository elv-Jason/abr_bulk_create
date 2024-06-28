// videoProps.js
//
// Provides functions for working with video properties.
// Also provides an example structure.

// --------------------------------------
// external modules
// --------------------------------------

const Fraction = require('fraction.js')
const R = require('ramda')

// --------------------------------------
// internal modules
// --------------------------------------

const {ratStrToNumber, swapFields} = require('./utils')

// --------------------------------------
// constants
// --------------------------------------

// Example video properties data structure
// 4k resolution,  16:9 aspect ratio (square pixels), 30 fps
const EXAMPLE = {
  width: 3840,
  height: 2160,
  sampleAspectRatio: '1',
  frameRate: '30'
}

// --------------------------------------
// internal functions
// --------------------------------------

// aspectRatioFraction :: VideoProps -> Fraction
// Returns aspect ratio for video as a fraction.js object, taking into account Sample Aspect Ratio in case
// pixels are not square
const aspectRatioFraction = videoProps =>
  new Fraction(videoProps.sampleAspectRatio)
    .mul(videoProps.width)
    .div(videoProps.height)

// --------------------------------------
// exported functions
// --------------------------------------

// aspectRatio :: VideoProps -> Number
// Returns aspect ratio for video as a number (double precision)
const aspectRatio = videoProps => aspectRatioFraction(videoProps).valueOf()

// aspectRatioDen :: VideoProps -> Number
// Returns denominator of aspect ratio, reducing fraction first if needed (e.g. 8/6 => 3)
const aspectRatioDen = videoProps => aspectRatioFraction(videoProps).d

// aspectRatioNum :: VideoProps -> Number
// Returns numerator of aspect ratio, reducing fraction first if needed (e.g. 8/6 => 4)
const aspectRatioNum = videoProps => aspectRatioFraction(videoProps).n

// frameRate :: VideoProps -> Number
// Returns frame rate for video as a number (often a float)
const frameRate = videoProps => ratStrToNumber(videoProps.frameRate)

// isLandscape :: VideoProps -> Boolean
// Returns true if given video is landscape (square is considered landscape for our purposes)
const isLandscape = videoProps => aspectRatio(videoProps) >= 1.0

// transpose :: VideoProps -> VideoProps
// Returns a copy of video properties with transposed orientation
const transpose = R.pipe(
  swapFields('height', 'width'),
  swapFields('sarHeight', 'sarWidth')
)

module.exports = {
  aspectRatio,
  aspectRatioDen,
  aspectRatioNum,
  EXAMPLE,
  frameRate,
  isLandscape,
  transpose
}
