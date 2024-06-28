// videoPropsModel.js
//
// Defines data structure for ingest video properties.

// --------------------------------------
// internal modules
// --------------------------------------

const M = require('../lib/models')

// --------------------------------------
// exported functions
// --------------------------------------

// VideoPropsModel :: a -> VideoPropsModel a | *exception*
// Returns either a validated VideoPropsModel or throws an exception
// (validates only property data types, not any of the limits defined in a parametric ladder)
//
// NOTE: an ingest file may contain audio also, causing apparent discrepancy
// where fileSize >> (duration * avgBitrate/8)
const VideoPropsModel = M.SealedModel({
  avgBitrate: [M.PositiveNumberModel], // optional (bps): will be checked against ParametricLadder.limits if supplied
  duration: [M.PositiveNumberModel],   // optional (seconds): will be checked against ParametricLadder.limits if supplied
  fileSize: [M.PositiveIntegerModel],  // optional (bytes): will be checked against ParametricLadder.limits if supplied
  frameRate: M.PositiveFractionStringModel,
  height: M.PositiveIntegerModel,
  sampleAspectRatio: M.PositiveFractionStringModel,
  width: M.PositiveIntegerModel
}).as('VideoProperties')

// validate :: a -> Err Array | Ok VideoPropsModel
// Returns a function to use for validation, that returns a crocks Result object that is either an Err (wrapping list
// of errors) if validation failed or an Ok (wrapping objectmodel.js instance) if validation succeeded
const validate = M.validator(VideoPropsModel)

module.exports = {
  validate,
  VideoPropsModel
}
