// parametricLadderModel.js
// Data validator for Parametric Ladder data structure

// --------------------------------------
// internal modules
// --------------------------------------

const M = require('../lib/models')

const RSM = require('./rungSpecModel')

// --------------------------------------
// internal functions
// --------------------------------------


const assertMaxGTEMin = (prefix, comparatorFn = M.numComparator) => M.validateGTE_withMessage(
  `${prefix}Max`,
  `${prefix}Min`,
  true,
  comparatorFn,
  'ParametricLadder.limits: ')


// --------------------------------------
// exported functions
// --------------------------------------

const PLOptionsModel = M.SealedModel({
  upscale: Boolean,
  snapAR: Boolean,
  maxARSnap: M.BoundedNumberModel(0, 1, true, false),
  minDimStepdown: M.BoundedNumberModel(0, 1, true, false),
  frameRateScaleFactor: M.BoundedNumberModel(0, 1, true, true)
}).as('PLOptionsModel')

const PLLimitsModel = M.SealedModel({
  aspectRatioMax: [M.PositiveFractionStringModel],
  aspectRatioMin: [M.PositiveFractionStringModel],
  avgBitrateMax: [M.PositiveIntegerModel],
  avgBitrateMin: [M.PositiveIntegerModel],
  fileSizeMax: [M.PositiveIntegerModel],
  fileSizeMin: [M.PositiveIntegerModel],
  durationMax: [M.PositiveIntegerModel],
  durationMin: [M.PositiveIntegerModel],
  finalBitrateMax: [M.PositiveIntegerModel],
  frameRateMax: [M.PositiveFractionStringModel],
  frameRateMin: [M.PositiveFractionStringModel],
  heightMax: [M.PositiveIntegerModel],
  heightMin: [M.PositiveIntegerModel],
  sampleAspectRatioMax: [M.PositiveFractionStringModel],
  sampleAspectRatioMin: [M.PositiveFractionStringModel],
  widthMax: [M.PositiveIntegerModel],
  widthMin: [M.PositiveIntegerModel],
})
  .assert(...assertMaxGTEMin('aspectRatio', M.fracStrComparator))
  .assert(...assertMaxGTEMin('avgBitrate'))
  .assert(...assertMaxGTEMin('fileSize'))
  .assert(...assertMaxGTEMin('duration'))
  .assert(...assertMaxGTEMin('frameRate', M.fracStrComparator,))
  .assert(...assertMaxGTEMin('height'))
  .assert(...assertMaxGTEMin('sampleAspectRatio',M.fracStrComparator))
  .assert(...assertMaxGTEMin('width'))
  .as('ParametricLadderLimits')

// ParametricLadderModel :: a -> ObjectModel | *exception*
// Returns either an ObjectModel instance containing parametric ladder info or throws an exception
const ParametricLadderModel = M.ObjectModel({
  baseAspectRatio: M.BoundedFractionStringModel('1',null,true,null), // at least 1 (no portrait mode)
  baseFrameRate: M.PositiveFractionStringModel,
  rungSpecs: RSM.RungSpecListModel,
  options: PLOptionsModel,
  limits: [PLLimitsModel]
})

module.exports = {
  ParametricLadderModel,
  PLLimitsModel,
  PLOptionsModel
}
