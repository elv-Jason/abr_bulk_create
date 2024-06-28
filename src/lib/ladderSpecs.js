// ladderSpecs.js
//
// Provides a function to take a post-computation Parametric Ladder and information on the ingest video and generate an
// object (containing a single 'ladder_specs' entry) that can be merged into an ABR Profile.

// --------------------------------------
// external modules
// --------------------------------------

const R = require('ramda')

// --------------------------------------
// internal modules
// --------------------------------------

const V = require('./videoProps')
const {mapIndexed} = require('./utils')

// --------------------------------------
// internal functions
// --------------------------------------

// keyString :: VideoProps -> String
// Creates ladder_specs key for a given ingest video
const keyString = videoProps =>
  `{"media_type":"video","aspect_ratio_height":${V.aspectRatioDen(videoProps)},"aspect_ratio_width":${V.aspectRatioNum(videoProps)}}`

// --------------------------------------
// exported functions
// --------------------------------------

// fromParametricLadder :: VideoProps => ParametricLadderComputed => LadderSpecs
// Takes a set of video properties and a parametric ladder that has been computed for that video and
// returns an ABR Profile LadderSpecs object with a single entry.
const fromParametricLadder = R.curry(
  (videoProps, parametricLadderComputed) => Object({
    [keyString(videoProps)]: {
      rung_specs: mapIndexed(
        (r, i) => Object({
          bit_rate: r.bitrate,
          height: r.height,
          media_type: 'video',
          pregenerate: i === 0,
          width: r.width
        }),
        parametricLadderComputed.rungSpecs
      )
    }
  })
)

module.exports = {
  fromParametricLadder
}
