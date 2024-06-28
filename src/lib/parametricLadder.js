// parametricLadder.js
//
// Defines data structure for a parametric video ABR ladder and functions for working with it,
// as well as a default ladder.
//
// Note that a parametric ladder's rungSpecs array must be ordered by descending dim,
// where each rungSpec has dim smaller than or equal to the previous rungSpec

// --------------------------------------
// external modules
// --------------------------------------

const R = require('ramda')
const when = require('crocks/logic/when')

// --------------------------------------
// internal modules
// --------------------------------------

const AR = require('./aspectRatio')
const RS = require('./rungSpec')
const V = require('./videoProps')
const {
  addComputedField,
  change,
  multiplier,
  ratStrToNumber,
  roundEven,
  roundToPrecision,
  swapFields
} = require('./utils')

// --------------------------------------
// constants
// --------------------------------------

const DEFAULT = {
  baseAspectRatio: '16/9',        // aspect ratio that rungSpec bitrates are intended for
  baseFrameRate: '30',            // frame rate that rungSpec bitrates are intended for
  rungSpecs: [
    {dim: 2160, bitrate: 14000000},  // the heights (or widths, for portrait mode videos) to use for rungs
    {dim: 1440, bitrate: 11500000},  // along with bitrate to use when video matches baseAspectRatio / baseFrameRate
    {dim: 1080, bitrate: 9500000},
    {dim: 720, bitrate: 4500000},
    {dim: 480, bitrate: 1750000},
    {dim: 360, bitrate: 810000},
    {dim: 240, bitrate: 500000},
  ],
  options: {
    upscale: false,            // use all rungSpecs even if source < top rung (if {upscale: false} && source < top rung, use dim from source as top rung)
    snapAR: false,              // snap aspect ratio for videos that are close to a standard AR
    maxARSnap: 0.06,           // correct up to 6% deviation from a standard aspect ratio (if {snapAR: true})
    minDimStepdown: 0.12,      // for cases where {upscale: false} is specified, make sure next rung dim is at least 12% smaller
    frameRateScaleFactor: 0.5, // for a 2x increase in fps, scale bitrate by only 1.5. For 0.5x decrease, scale bitrate by only 0.75
  },
  limits: {                    // refuse to generate ladder if source video violates any of these parameters
    aspectRatioMax: '3',         // landscape 3:1
    aspectRatioMin: '1/3',     // portrait 1:3
    avgBitrateMax: 100000000,  // 100 mbps
    avgBitrateMin: 100000,     // 100 kbps
    fileSizeMax: 100000000,    // 100 MB
    fileSizeMin: 10000,        // 10 KB
    durationMax: 3600 * 4,     // four hours
    durationMin: 1,            // 1 second
    finalBitrateMax: 30000000, // max top rung bitrate in final generated ladder: 30 mbps
    frameRateMax: '60',
    frameRateMin: '15',
    heightMax: 5000,
    heightMin: 100,
    sampleAspectRatioMax: '3/2',   // non-square pixels max ratio 3:2
    sampleAspectRatioMin: '2/3', // non-square pixels min ratio 2:3
    widthMax: 5000,
    widthMin: 100,
  }
}

// Shorthand accessor for modifying rungSpecs
const RUNG_SPECS_LENS = R.lensProp('rungSpecs')

// --------------------------------------
// internal functions
// --------------------------------------

// adjustRungSpecBitrates :: ParametricLadder -> Number -> Number -> ParametricLadder
// Returns a shallow copy of parametricLadder with rungSpecs replaced by shallow
// copy of rungSpecs 'bitrate' adjusted for a particular aspect ratio and target frame rate
const adjustRungSpecBitrates = R.curry(
  (finalLadderAR, ingestFrameRate, parametricLadder) => rungSpecsReplace(
    R.map(
      r => R.assoc(
        'bitrate',
        r.bitrate * bitrateAdjustmentFactor(
          parametricLadder,
          finalLadderAR,
          ingestFrameRate
        ),
        r
      )
    ),
    parametricLadder
  )
)

// addRungSpecHeightsAndWidths :: Number -> ParametricLadder -> ParametricLadderWithRungSpecsWithHeightAndWidth
// Returns a shallow copy of parametricLadder with rungSpecs replaced by shallow
// copy of rungSpecs with new calculated fields 'height' and 'width' added.
// Note that 'height' is always set to dim because for internal calculations we always work in landscape orientation
const addRungSpecHeightsAndWidths = R.curry(
  (finalLadderAR, parametricLadder) => rungSpecsReplace(
    R.pipe(
      R.map(addComputedField(
        'height',
        R.prop('dim')
      )),
      R.map(addComputedField(
        'width',
        r => roundEven(r.dim * finalLadderAR)
      )),
    ),
    parametricLadder
  )
)

// bitrateAdjustmentFactor :: ParametricLadder -> Number -> Number -> Number
// Returns multiplier to adjust bitrate in parametric ladder's rung specs
// a given frame rate and aspect ratio
const bitrateAdjustmentFactor = (parametricLadder, finalLadderAR, ingestFrameRate) =>
  bitrateFrameRateMult(
    parametricLadder.options.frameRateScaleFactor,
    ratStrToNumber(parametricLadder.baseFrameRate),
    ingestFrameRate
  ) *
  bitrateARMult(
    ratStrToNumber(parametricLadder.baseAspectRatio),
    finalLadderAR
  )

// bitrateARMult :: Number -> Number -> Number
// Returns multiplier for adjusting bitrate based on difference in aspect ratios
const bitrateARMult = R.curry(
  (baseAR, finalLadderAR) => multiplier(change(baseAR, finalLadderAR))
)

// bitrateFrameRateMult :: Number -> Number -> Number -> Number
// Returns multiplier for adjusting bitrate based on difference in frame rates, given a proportionality constant
// (suggested value for propConstant: 0.5)
const bitrateFrameRateMult = (propConstant, baseFrameRate, ingestFrameRate) =>
  multiplier(propConstant * change(baseFrameRate, ingestFrameRate))

// computeRungs :: AspectRatioArray -> ParametricLadder -> VideoProps -> ParametricLadderComputed
// Returns a shallow copy of parametricLadder with rungSpecs computed for a specific (landscape or square) video and
// a set of standard aspect ratios to use for possible snapping.
const computeRungs = (aspectRatioList, parametricLadder, landscapeVideoProps) =>
  computeRungsForAR(
    AR.target(
      aspectRatioList,
      parametricLadder.options.snapAR,
      parametricLadder.options.maxARSnap,
      V.aspectRatio(landscapeVideoProps)
    ),
    parametricLadder,
    landscapeVideoProps
  )

// computeRungsForAR :: Number -> ParametricLadder -> VideoProps -> ParametricLadderComputed
// Returns a shallow copy of parametricLadder with rungSpecs computed for a specific (landscape or square) video and
// a given (landscape or square) aspect ratio
const computeRungsForAR = (aspectRatio, parametricLadder, landscapeVideoProps) => R.pipe(
  adjustRungSpecBitrates(
    aspectRatio,
    V.frameRate(landscapeVideoProps)
  ),
  // tapPipe('computeRungsForAR, after adjustRungSpecBitrates'),
  when(
    rungSpecAdditionNeeded(landscapeVideoProps.height),
    rungSpecAdd(landscapeVideoProps.height)
  ),
  // tapPipe('computeRungsForAR, after rungSpecAdd'),
  when(
    rungSpecRemovalNeeded(landscapeVideoProps.height),
    rungSpecsRemove(landscapeVideoProps.height)
  ),
  addRungSpecHeightsAndWidths(aspectRatio),
  when(
    R.pipe(
      R.path(['limits', 'finalBitrateMax']),
      R.isNil,
      R.not
    ),
    rungSpecsCapMaxBitrate
  ),
  rungSpecsRoundBitrates
)(parametricLadder)

// rungSpecAdd :: Number -> ParametricLadder -> ParametricLadder
// Adds a new rung spec for a given dim (calculating an extrapolated bitrate) to a parametric ladder's rung specs
// Returns a modified shallow copy of ladder
const rungSpecAdd = R.curry(
  (landscapeVideoHeight, parametricLadder) => rungSpecsReplace(
    RS.insertIntoArray(
      {
        dim: landscapeVideoHeight,
        bitrate: RS.bitrateForNoUpscaleRungSpec(
          R.view(RUNG_SPECS_LENS, parametricLadder),
          landscapeVideoHeight
        )
      }
    ),
    parametricLadder
  )
)

// rungSpecAdditionNeeded :: ParametricLadder -> Number -> Boolean
// Returns whether or not to we need to add a new top RungSpec for a particular video
// (only if options.upscale == false and video's smaller dimension is < top parametric rungSpec dimension
// and there is no existing RungSpec with dim == landscapeVideoHeight)
const rungSpecAdditionNeeded = R.curry(
  (landscapeVideoHeight, parametricLadder) =>
    rungSpecRemovalNeeded(landscapeVideoHeight, parametricLadder) &&
    !rungSpecExists(parametricLadder, landscapeVideoHeight)
)

// rungSpecExists :: ParametricLadder -> Number -> Boolean
// Returns true if a ParametricLadder.rungSpecs contains an element dim == landscapeVideoHeight
const rungSpecExists = (parametricLadder, landscapeVideoHeight) =>
  rungSpecForDim(parametricLadder, landscapeVideoHeight) !== undefined

// rungSpecForDim :: ParametricLadder -> Number -> RungSpec
// Returns first RungSpec from parametricLadder.rungSpecs with dim == landscapeVideoHeight,
// or undefined if no matching RungSpec found
const rungSpecForDim = (parametricLadder, landscapeVideoHeight) =>
  parametricLadder.rungSpecs.find(r => r.dim === landscapeVideoHeight)

// rungSpecRemovalNeeded :: ParametricLadder -> Number -> Boolean
// Returns whether or not to we need to remove any RungSpecs from top of parametricLadder
// (options.upscale == false and video's smaller dimension is < top rungSpec dimension
const rungSpecRemovalNeeded = R.curry(
  (landscapeVideoHeight, parametricLadder) =>
    !parametricLadder.options.upscale &&
    topRungSpecDim(parametricLadder) > landscapeVideoHeight
)

// rungSpecsRemove :: ParametricLadder -> Number -> ParametricLadder
// Returns a shallow copy of ParametricLadder with rungSpecs replaced with
// shallow copy of rungSpecs that has elements removed where dim is larger than landscapeVideoHeight
// (i.e. remove rungSpecs that would result in upscaling) or dim is smaller than landscapeVideoHeight but
// within minDimStepdown (i.e. a new top rungSpec will be added for landscapeVideoHeight, and the existing rungSpec would
// result in a lower rung that is too close to the new top rung)
const rungSpecsRemove = R.curry(
  (landscapeVideoHeight, parametricLadder) =>
    rungSpecsReplace(
      R.filter(
        r => r.dim === landscapeVideoHeight ||
          r.dim < landscapeVideoHeight &&
          -change(landscapeVideoHeight, r.dim) >= parametricLadder.options.minDimStepdown
      ),
      parametricLadder
    )
)

// rungSpecsReplace :: (RungSpecsArray -> RungSpecsArray) -> ParametricLadder -> ParametricLadder
// Returns a shallow copy of parametricLadder with rungSpecs replaced by rungSpecGenerator(parametricLadder.rungSpecs)
const rungSpecsReplace = R.curry(
  (rungSpecGenerator, parametricLadder) =>
    R.over(
      RUNG_SPECS_LENS,
      rungSpecGenerator,
      parametricLadder
    )
)

// rungSpecsRoundBitrates :: ParametricLadder -> ParametricLadder
// Returns a shallow copy of parametric ladder with shallow copy of rungSpecs where each rungSpec's bitrate has been
// replaced with a value rounded to 3 significant figures
const rungSpecsRoundBitrates = parametricLadder =>
  rungSpecsReplace(
    R.map(
      r => R.assoc(
        'bitrate',
        roundToPrecision(3, r.bitrate),
        r
      )
    ),
    parametricLadder
  )


// rungSpecsCapMaxBitrate :: ParametricLadder -> ParametricLadder
// Returns a shallow copy of parametric ladder with shallow copy of rungSpecs where each rungSpec's bitrate has been
// replaced with a value rounded to 3 significant figures
const rungSpecsCapMaxBitrate = parametricLadder =>
  topRungSpec(parametricLadder).bitrate > parametricLadder.limits.finalBitrateMax ?
    rungSpecsReplace(
      R.map(
        r => R.assoc(
          'bitrate',
          r.bitrate * parametricLadder.limits.finalBitrateMax / topRungSpec(parametricLadder).bitrate,
          r
        )
      ),
      parametricLadder
    ) :
    parametricLadder

// rungSpecsTranspose :: ParametricLadderWihRungSpecHeightsAndWidths -> ParametricLadderWihRungSpecHeightsAndWidths
// Returns rungs with height and width of each rung swapped
const rungSpecsTranspose = parametricLadderWithHWs =>
  rungSpecsReplace(
    R.map(swapFields('height', 'width')),
    parametricLadderWithHWs
  )

// topRungSpec :: ParametricLadder -> RungSpec
// Returns top (first) RungSpec
// Note that rungSpecs must be in descending order by dim and bitrate
const topRungSpec = parametricLadder => R.head(R.view(RUNG_SPECS_LENS, parametricLadder))

// topRungSpecDim :: ParametricLadder -> Number
// Returns dimension of top RungSpec
const topRungSpecDim = parametricLadder => R.view(RS.DIM_LENS, topRungSpec(parametricLadder))

// --------------------------------------
// exported functions
// --------------------------------------

// computeValues :: AspectRatioArray -> ParametricLadder -> VideoProps -> ParametricLadderComputed
// Determines final parametric ladder rungSpecs for a give ingest video and set of standard aspect ratios,
// adding heights, widths, and bitrates to each final RungSpec.
const computeValues = R.curry(
  (aspectRatioList, parametricLadder, videoProps) =>
    V.isLandscape(videoProps) ?
      computeRungs(aspectRatioList, parametricLadder, videoProps) :
      rungSpecsTranspose(
        computeRungs(aspectRatioList, parametricLadder, V.transpose(videoProps))
      )
)

module.exports = {
  computeValues,
  DEFAULT
}
