// testCaseGenerator.js
//
// Functions to create test cases and save to file
//
// For video properties, there are 5 variables:
//   aspect ratio
//   dimension (smaller of height/width of video)
//   frame rate
//   orientation
//   sample aspect ratio
//
// For parametric ladder, there are 2 variables:
//   upscale
//   snapAR

// --------------------------------------
// external modules
// --------------------------------------

const fs = require('fs')
const path = require('path')

const R = require('ramda')

// --------------------------------------
// internal modules
// --------------------------------------

const U = require('../../src/lib/utils')
const LadderGen = require('../../src/ElvABRProfile')

// --------------------------------------
// constants
// --------------------------------------

// value to add/subtract from change thresholds
const EPSILON = 0.01

// minimum difference in AR between entries in STANDARD_ASPECT_RATIOS is ~4%, use a stricter value for testing to
// allow generation of test cases in between each pair of adjacent aspect ratio entries
const TEST_MAX_AR_SNAP = 0.02


const upscaleCases = [
  {upscale: true, case: 'OptUpscaleTrue'},
  {upscale: false, case: 'OptUpscaleFalse'}
]

const snapARCases = [
  {snapAR: true, case: 'OptSnapARTrue'},
  {snapAR: false, case: 'OptSnapARFalse'}
]


const orientationCases = [
  {orientation: 'landscape', case: 'VideoLandscape'},
  {orientation: 'portrait', case: 'VideoPortrait'}
]

const sampleAspectRatioCases = [
  {sampleAspectRatio: '1', case: 'VideoSquarePixels'},
  {sampleAspectRatio: '5/6', case: 'VideoThinPixels'},
  {sampleAspectRatio: '6/5', case: 'VideoFatPixels'}
]


// --------------------------------------
// internal functions
// --------------------------------------

// if quick == true, take first/middle/last of cases
const abbreviateCases = (quick, cases) => quick ?
  R.props(
    R.uniq([0, Math.floor(cases.length / 2), cases.length - 1]),
    cases
  ) :
  cases

const addVideoComputedValues = R.pipe(
  U.addComputedField(
    'intendedAspectRatio',
    vc => vc.orientation === 'landscape' ?
      vc.landscapeAR :
      1 / vc.landscapeAR
  ),
  U.addComputedField(
    'height',
    vc => vc.orientation === 'landscape' ?
      vc.dim :
      U.roundEven(vc.dim * vc.landscapeAR * U.ratStrToNumber(vc.sampleAspectRatio))
  ),
  U.addComputedField(
    'width',
    vc => vc.orientation === 'landscape' ?
      vc.landscapeAR === 1 && vc.sampleAspectRatio !== '1' && U.roundEven((vc.dim * vc.landscapeAR) / U.ratStrToNumber(vc.sampleAspectRatio)) * U.ratNumerator(vc.sampleAspectRatio) < (vc.dim * U.ratDenominator(vc.sampleAspectRatio)) ?
        U.roundEven((vc.dim * vc.landscapeAR) / U.ratStrToNumber(vc.sampleAspectRatio)) + 2 : // for aspect ratio of 1, protect against rounding issues causing the video to become portrait mode - round up a notch if needed
        U.roundEven((vc.dim * vc.landscapeAR) / U.ratStrToNumber(vc.sampleAspectRatio)) :
      vc.dim
  ),
  U.addComputedField(
    'actualAspectRatio',
    vc => U.ratStrToNumber(vc.sampleAspectRatio) * (vc.width  / vc.height)
  )
)

const aspectRatioCases = (standardAspectRatios, quick = false) => R.sort(
  R.descend(R.prop('landscapeAR')),
  R.flatten(
    abbreviateCases(quick, standardAspectRatios).map(
      U.addComputedField('ratio', arRec => arRec.w / arRec.h)
    ).map(
      arRecWithFloat => [
        {
          landscapeAR: arRecWithFloat.ratio,
          case: `VideoAR${arRecWithFloat.ratio}+VideoAREqualOrAlmostEqualStandard+ClosestStandardAR${arRecWithFloat.w}:${arRecWithFloat.h}`
        },
        {
          landscapeAR: arRecWithFloat.ratio * (1 + (TEST_MAX_AR_SNAP + EPSILON)),
          case: `VideoAR${arRecWithFloat.ratio * (1 + (TEST_MAX_AR_SNAP + EPSILON))}+VideoARViolatesMaxSnapOver+ClosestStandardAR${arRecWithFloat.w}:${arRecWithFloat.h}`
        },
        {
          landscapeAR: arRecWithFloat.ratio * (1 - (TEST_MAX_AR_SNAP + EPSILON)),
          case: `VideoAR${arRecWithFloat.ratio * (1 - (TEST_MAX_AR_SNAP + EPSILON))}+VideoARViolatesMaxSnapUnder+ClosestStandardAR${arRecWithFloat.w}:${arRecWithFloat.h}`
        },
        {
          landscapeAR: arRecWithFloat.ratio * (1 + (TEST_MAX_AR_SNAP - EPSILON)),
          case: `VideoAR${arRecWithFloat.ratio * (1 + (TEST_MAX_AR_SNAP - EPSILON))}+VideoARSatisfiesMaxSnapOver+ClosestStandardAR${arRecWithFloat.w}:${arRecWithFloat.h}`
        },
        {
          landscapeAR: arRecWithFloat.ratio * (1 - (TEST_MAX_AR_SNAP - EPSILON)),
          case: `VideoAR${arRecWithFloat.ratio * (1 - (TEST_MAX_AR_SNAP - EPSILON))}+VideoARSatisfiesMaxSnapUnder+ClosestStandardAR${arRecWithFloat.w}:${arRecWithFloat.h}`
        },
      ]
    )
  )).filter(c => c.landscapeAR >= 1.0) // filter out the snapUnder cases for StdAR of 1:1, which would cause portrait AR

const dimensionCases = (parametricLadder, quick = false) => {
  const plRungSpecDims = R.uniq(R.pluck('dim', abbreviateCases(quick, parametricLadder.rungSpecs)))
  return R.sort(
    R.descend(R.prop('dim')),
    R.flatten([
      {
        dim: U.roundEven(R.head(plRungSpecDims) * 1.25),
        case: `VideoDim${U.roundEven(R.head(plRungSpecDims) * 1.25)}+VideoDimLargerThanTopRung+ComparisonRungDim${R.head(plRungSpecDims)}`
      },
      plRungSpecDims.map(d => Object({dim: d, case: `VideoDim${d}+VideoDimEqualsRungDim+ComparisonRungDim${d}`})),
      plRungSpecDims.map(d => Object({
        dim: U.roundEven(d / (1 - (parametricLadder.options.minDimStepdown - EPSILON))),
        case: `VideoDim${U.roundEven(d / (1 - (parametricLadder.options.minDimStepdown - EPSILON)))}+VideoDimViolatesMinStepdownDim+ComparisonRungDim${d}`
      })),
      plRungSpecDims.map(d => Object({
        dim: U.roundEven(d / (1 - (parametricLadder.options.minDimStepdown + EPSILON))),
        case: `VideoDim${U.roundEven(d / (1 - (parametricLadder.options.minDimStepdown + EPSILON)))}+VideoDimSatisfiesMinStepdownDim+ComparisonRungDim${d}`
      })),
      {
        dim: U.roundEven(R.last(plRungSpecDims) * 0.75),
        case: `VideoDim${U.roundEven(R.last(plRungSpecDims) * 0.75)}+VideoDimSmallerThanBottomRung+ComparisonRungDim${R.last(plRungSpecDims)}`
      }
    ])
  )
}

const frameRateCases = parametricLadder => [
  {frameRate: parametricLadder.baseFrameRate, case: 'Video1xBaseFrameRate'},
  {frameRate: U.ratFromStr(parametricLadder.baseFrameRate).mul(2).toFraction(), case: 'Video2xBaseFrameRate'},
  {frameRate: U.ratFromStr(parametricLadder.baseFrameRate).div(2).toFraction(), case: 'Video0.5xBaseFrameRate'},
]

const ladderCaseGenerator = parametricLadder => {
  // merge options from each case into a separate parametric ladder spec,
  // moving 'case' field to top
  return U.permuterGenFn(
    upscaleCases,
    snapARCases,
    R.pipe(
      R.mergeWith(U.join('+')),
      c => R.mergeDeepRight(
        R.clone(parametricLadder),
        {
          case: c.case,
          options: R.dissoc('case', c)
        }
      )
    )
  )
}

const videoCaseGenerator = (standardAspectRatios, parametricLadder, quick = false) => {

  // cross aspectRatio cases with orientation cases
  const ArCasesPlusOrCases = U.permuterGenFn(
    aspectRatioCases(standardAspectRatios, quick),
    orientationCases,
    R.mergeWith(U.join('+')),
    c => !(c.landscapeAR === 1.0 && c.orientation === 'portrait') // weed out the combination of aspect ratio 1:1 + portrait orientation
  )

  // cross with dimension cases
  const PlusDimCases = U.permuterGenFn(
    ArCasesPlusOrCases,
    dimensionCases(parametricLadder, quick),
    R.mergeWith(U.join('+'))
  )

  // cross with dimension and sample aspect ratio cases,
  // add height and width, actual aspect ratio
  const PlusSarCases = U.permuterGenFn(
    PlusDimCases,
    sampleAspectRatioCases,
    R.pipe(
      R.mergeWith(U.join('+')),
      addVideoComputedValues
    )
  )

  // cross with frame rate cases,
  // gather extra fields into 'extras'
  return U.permuterGenFn(
    PlusSarCases,
    frameRateCases(parametricLadder),
    R.pipe(
      R.mergeWith(U.join('+')),
      c => R.assoc(
        'extras',
        R.pick(['dim', 'landscapeAR', 'orientation', 'intendedAspectRatio', 'actualAspectRatio'], c),
        R.pick(['case', 'height', 'width', 'sampleAspectRatio', 'frameRate'], c)
      )
    )
  )
}


// --------------------------------------
// exported functions
// --------------------------------------

// Returns a JavaScript Generator that can be iterated over with for ... of
// to allow processing of items without pre-generating entire list.
const testCaseGenerator = (quick = false) => {
  const testLadder = R.assocPath(['options', 'maxARSnap'], TEST_MAX_AR_SNAP, LadderGen.DEFAULT_PARAMETRIC_LADDER)
  const videoCases = videoCaseGenerator(LadderGen.DEFAULT_STANDARD_ASPECT_RATIOS, testLadder, quick)
  const ladderCases = ladderCaseGenerator(testLadder)

  // permute all combinations of ladders and videos, moving 'case' field to top level
  // as well as video extras
  return U.permuterGenFn(
    videoCases,
    ladderCases,
    (vc, lc) => Object({
      ladder: R.dissoc('case', lc),
      video: R.dissoc('extras', R.dissoc('case', vc)),
      case: U.join('+', lc.case, vc.case),
      extras: vc.extras
    })
  )() // invoke immediately to return the generator
}

const writeTestCases = (filename, quick = false) => {
  let cases = ['"width","height","sampleAspectRatio","frameRate","upscale","snapAR","case","JS ladder"']
  for (const c of testCaseGenerator(quick)) {
    const ls = LadderGen.VideoLadderSpecs(c.video, c.ladder)
    if (!ls.ok) {
      console.log(JSON.stringify(ls, null, 2))
      console.log(JSON.stringify(c.video, null, 2))
      console.log(JSON.stringify(c.ladder, null, 2))
    }
    const key = Object.keys(ls.result)[0]
    const finalLadderString = ls.result[key].rung_specs.map(r => `${r.width}-${r.height}-${r.bit_rate}`).join('-')
    cases.push(
      [
        c.video.width,
        c.video.height,
        c.video.sampleAspectRatio,
        c.video.frameRate,
        c.ladder.options.upscale,
        c.ladder.options.snapAR,
        `"${c.case}"`,
        JSON.stringify(finalLadderString)
      ].join(',')
    )
  }
  const csv = cases.join('\n')

  const fullPath = path.resolve(__dirname, filename)
  console.log(`writing to ${fullPath}`)
  fs.writeFileSync(fullPath, csv)
}

module.exports = {
  testCaseGenerator,
  writeTestCases
}

// writeTestCases('short-list.csv', true)
