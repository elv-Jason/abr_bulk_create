// aspectRatioListModel.js
//
// Defines data structure for a list of aspect ratios to snap to.

// --------------------------------------
// internal modules
// --------------------------------------

const M = require('../lib/models')
const {AspectRatioRecModel, LandscapeAspectRatioRecModel} = require('./aspectRatioRecModel')

// --------------------------------------
// exported functions
// --------------------------------------

// AspectRatioListModel :: a -> AspectRatioListModel a | *exception*
// Returns either a validated AspectRatioListModel or throws an exception
const AspectRatioListModel = M.NonEmptyArrayModel(AspectRatioRecModel)

// LandscapeAspectRatioListModel :: a -> LandscapeAspectRatioListModel a | *exception*
// Returns either a validated AspectRatioListModel or throws an exception
const LandscapeAspectRatioListModel = M.NonEmptyArrayModel(LandscapeAspectRatioRecModel)

module.exports = {
  AspectRatioListModel,
  LandscapeAspectRatioListModel
}
