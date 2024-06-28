// aspectRatioRecModel.js
//
// Defines data structure for a (non-portrait) aspect ratio to snap to.

// --------------------------------------
// internal modules
// --------------------------------------

const M = require('../lib/models')

// --------------------------------------
// internal functions
// --------------------------------------

const AR_REC_FIELDS = {
  w: M.PositiveIntegerModel,
  h: M.PositiveIntegerModel,
  desc: M.NonBlankStringModel
}

// --------------------------------------
// exported functions
// --------------------------------------

// AspectRatioRecModel :: a -> VideoPropsModel a | *exception*
// Returns either a validated VideoPropsModel or throws an exception
const AspectRatioRecModel = M.SealedModel(AR_REC_FIELDS)

const LandscapeAspectRatioRecModel = M.SealedModel(AR_REC_FIELDS).assert(
  M.validateThenAssertFalse(AspectRatioRecModel, ar => ar.w < ar.h),
  M.assertionErrMsg('must not define a portrait aspect ratio')
)

module.exports = {
  AspectRatioRecModel,
  LandscapeAspectRatioRecModel
}
