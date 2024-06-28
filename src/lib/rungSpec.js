// rungSpec.js
//
// Defines data structure for a parametric video ABR ladder rungSpecs element and functions for working with it.

// --------------------------------------
// external modules
// --------------------------------------

// const kindof = require('kind-of')
const R = require('ramda')

// --------------------------------------
// internal modules
// --------------------------------------

const {change, mapIndexed} = require('./utils')


// --------------------------------------
// constants
// --------------------------------------

// Accessor for dim
const DIM_LENS = R.lensProp('dim')

// --------------------------------------
// internal functions
// --------------------------------------


// dimDeviation :: Number -> RungSpec -> Number
// Returns proportional change of deviation of a comparison value from rungSpec.dim
const dimDeviation = R.curry(
  (ingestVideoDim, rungSpec) => change(ingestVideoDim, rungSpec.dim)
)



// newRungLowerNeighbor :: [RungSpec] -> Integer -> (RungSpec, i | undefined)
// Returns a RungSpec and its index within rungSpecs, for the one immediately below insertion point for a new RungSpec
// with dim == landscapeVideoHeight
// (or undefined if landscapeVideoHeight is less than anything in rungSpecs
const newRungLowerNeighbor = (rungSpecs, landscapeVideoHeight) =>
  R.head(
    R.filter(
      (rsIndexPair) => rsIndexPair[0].dim < landscapeVideoHeight,
      mapIndexed((rs, i) => [rs, i], rungSpecs),
    )
  )

// newRungUpperNeighbor :: [RungSpec] -> Integer -> (RungSpec, i | undefined)
// Returns a RungSpec and its index within rungSpecs, for the one immediately above insertion point for a new RungSpec
// with dim == landscapeVideoHeight
// (or undefined if landscapeVideoHeight is greater than anything in rungSpecs
const newRungUpperNeighbor = (rungSpecs, landscapeVideoHeight) =>
  R.last(
    R.filter(
      (rsIndexPair) => rsIndexPair[0].dim > landscapeVideoHeight,
      mapIndexed((rs, i) => [rs, i], rungSpecs),
    )
  )



// nextRungBitrate :: Number -> Number -> Number -> Number -> Number
// Given a bitrate for one rung, scale it for the next rung based on that rung's proportional change in number of pixels and the rung's tuning factor.
// const nextRungBitrate = (bitrateToScale, originalDim, targetDim, targetTuningFactor) =>
//   bitrateToScale *
//   targetTuningFactor *
//   multiplier(change(originalDim ** 2, targetDim ** 2))


// --------------------------------------
// exported functions
// --------------------------------------

// absDimDeviation :: Number -> RungSpec -> Number
// Returns absolute value of deviation of a comparison value from RungSpec.dim
const absDimDeviation = R.curry(
  (ingestVideoDim, rungSpec) => Math.abs(dimDeviation(ingestVideoDim, rungSpec))
)

// bitrateAdder :: (Number | [ParametricLadderRungSpecs]) a => a -> ParametricLadderRung -> a
// Reducing function used by plWithBitrates()
// Note that we change accumulator from a initial number to an array to
// allow differentiation between first iteration and subsequent iterations
// const bitrateAdder = (resultAccumulator, rungSpec) => kindof(resultAccumulator) === 'number' ?
//   [R.assoc('bitrate', resultAccumulator, rungSpec)] :
//   [...resultAccumulator, R.assoc(
//     'bitrate',
//     nextRungBitrate(R.last(resultAccumulator).bitrate, R.last(resultAccumulator).dim, rungSpec.dim, rungSpec.tuning),
//     rungSpec
//   )]

// bitrateDimMult :: RungSpec -> Number -> Number
// Returns multiplier for adjusting bitrate from an existing RungSpec to a new dim
// const bitrateDimMult = (rungSpec, targetDim) =>
//   rungSpec.dim === targetDim ?
//     1.0 : // if dim is unchanged, then use original bitrate
//     // bitrate change is proportional to change in pixel count, equivalent to proportional change in square of dim
//     multiplier(change(rungSpec.dim ** 2, targetDim ** 2)) *
//     // determine tuning factor
//     (
//       rungSpec.dim > targetDim ?
//         rungSpec.tuning : // scaling down, multiply by original tuning factor
//         1.0 / rungSpec.tuning // scaling up, invert tuning factor
//     )


// bitrateForNoUpscaleRungSpec :: RungSpec -> Number -> Number
// Computes bitrate for new RungSpec by extrapolating from existing parametric ladder
const bitrateForNoUpscaleRungSpec = (existingRungSpecs, landscapeVideoHeight) => {


  const upperNeighborPlusIndex = newRungUpperNeighbor(existingRungSpecs, landscapeVideoHeight)
  const lowerNeighborPlusIndex = newRungLowerNeighbor(existingRungSpecs, landscapeVideoHeight)

  const bitrate1 = upperNeighborPlusIndex[0].bitrate
  const dim1 = upperNeighborPlusIndex[0].dim
  const bitrate2 = lowerNeighborPlusIndex ? lowerNeighborPlusIndex[0].bitrate : 0
  const dim2 = lowerNeighborPlusIndex ? lowerNeighborPlusIndex[0].dim : 0

  const slope = (bitrate1-bitrate2)/(dim1 * dim1 - dim2 * dim2)
  const intercept = bitrate1 - slope * dim1 * dim1

  return slope * landscapeVideoHeight * landscapeVideoHeight + intercept
}

// insertIntoArray :: RungSpec -> RungSpecArray -> RungSpecArray
// Returns shallow copy of rungSpecs with newRung inserted, keeping result sorted by dim in descending order
const insertIntoArray = R.curry(
  (newRung, rungSpecs) => R.pipe(
    R.splitWhen(r => r.dim < newRung.dim),
    R.insert(1, newRung),
    R.flatten
  )(rungSpecs)
)


module.exports = {
  absDimDeviation,
  // bitrateAdder,
  // bitrateDimMult,
  bitrateForNoUpscaleRungSpec,
  DIM_LENS,
  insertIntoArray
}
