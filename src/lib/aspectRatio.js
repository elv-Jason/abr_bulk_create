// aspectRatio.js
//
// Provides a default list of standard (landscape or square) aspect ratios and a lookup function to
// snap an arbitrary value to a standard (within a certain tolerance)

// --------------------------------------
// external modules
// --------------------------------------

const R = require('ramda')

// --------------------------------------
// internal modules
// --------------------------------------

const {addComputedField, change, snapWithinTolerance} = require('./utils')

// --------------------------------------
// constants
// --------------------------------------

const STANDARDS = [
  {w: 69, h: 25, desc: 'Ultra Panavision 70 (2.76:1)'},
  {w: 47, h: 20, desc: 'Widescreen cinema (2.35:1)'},
  {w: 11, h: 5, desc: 'Standard 70mm film (2.2:1)'},
  {w: 2, h: 1, desc: 'Univisium (2:1)'},
  {w: 37, h: 20, desc: 'US widescreen cinema (1.85:1)'},
  {w: 16, h: 9, desc: 'HD TV (1.78:1)'},
  {w: 5, h: 3, desc: 'European widescreen, 16mm film (1.67:1)'},
  {w: 3, h: 2, desc: '35mm photograph (1.5:1)'},
  {w: 143, h: 100, desc: 'IMAX (1.43:1)'},
  {w: 4, h: 3, desc: 'SD TV (1.33:1)'},
  {w: 6, h: 5, desc: 'Fox Movietone (1.2:1)'},
  {w: 1, h: 1, desc: 'Square (1:1)'}
]

// --------------------------------------
// internal functions
// --------------------------------------

// absDeviation :: Number -> AspectRatioRecPlusFloat -> Number
// Returns absolute value of deviation of a comparison value from an aspect ratio record that
// has had a 'float' field added
const absDeviation = R.curry(
  (comparisonAR, arRec) => Math.abs(deviation(comparisonAR, arRec))
)

// closest:: AspectRatioRecArray -> Number => AspectRatioRecPlusFloatPlusAbsARDeviation
// Returns Aspect Ratio record (with 'float' and 'absDeviation' fields added) for the standard aspect ratio
// that is closest to a given value
const closest = R.curry(
  (ratioList, arValue) =>
    R.pipe(
      R.map(addComputedField('float', float)),
      R.map(addComputedField('absDeviation', absDeviation(arValue))),
      R.sortWith([R.ascend(R.prop('absDeviation')),R.ascend(R.prop('float'))]), // sort by abs deviation first, then ratio
      R.head
    )(ratioList)
)

// deviation :: Number -> AspectRatioRecPlusFloat -> Number
// Returns deviation of a comparison value from a standard aspect ratio record that has had 'float' field added
const deviation = R.curry(
  (comparisonAR, arRec) => change(arRec.float, comparisonAR)
)

// float :: StdARRec -> Number
// Calculates an aspect ratio value for a standard aspect ratio record
const float = arRec => arRec.w / arRec.h

// --------------------------------------
// exported functions
// --------------------------------------

// target :: AspectRatioList -> Number -> Number -> Number -> Number
// Returns the aspect ratio to use to generate the second dimension for each rung in ladder
// by comparing video to standard aspect ratios and checking 'snap' options
const target = R.curry(
  (aspectRatioList, snapAR, maxARSnap, landscapeIngestAR) =>
    snapAR ?
      snapWithinTolerance(
        maxARSnap,
        closest(aspectRatioList, landscapeIngestAR).float,
        landscapeIngestAR
      ) :
      landscapeIngestAR
)

module.exports = {
  STANDARDS,
  target
}
