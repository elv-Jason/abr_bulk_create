// ladderSpecsModel.js
//
// Defines data structure for an ABR Profile ladder_specs object
// NOTE: only video is supported, and only x264 encoder


// --------------------------------------
// internal modules
// --------------------------------------

const M = require('../lib/models')


// --------------------------------------
// internal functions
// --------------------------------------

const REGEX_LADDER_SPEC_KEY = /^{"media_type":"video","aspect_ratio_height":[1-9][0-9]*,"aspect_ratio_width":[1-9][0-9]*}$/

// --------------------------------------
// exported functions
// --------------------------------------

const X264VideoRungSpecModel = M.SealedModel(
  {
    bit_rate: M.PositiveIntegerModel,
    height: M.PositiveIntegerModel,
    media_type: 'video',
    pregenerate: Boolean,
    width: M.PositiveIntegerModel
  }
).as('X264VideoRungSpec')

const RungSpecListModel = M.ArrayModel(X264VideoRungSpecModel)

const VideoLadderSpecKeyModel = M.NonBlankStringModel.extend().assert(
  str => REGEX_LADDER_SPEC_KEY.exec(str) !== null,
  'ladder spec key not in proper format'
).as('LadderSpecKey')

const LadderSpecEntryModel = M.SealedModel({rung_specs: RungSpecListModel}).as('LadderSpecEntry')

// NOTE: if support for audio ladder specs are added, additional validation check will be needed to ensure
// that an audio ladder spec key does not have a value with video rung specs (and vice versa)
const LadderSpecsModel = M.KVMapModel({
  keyModel:VideoLadderSpecKeyModel,
  valueModel: LadderSpecEntryModel
}).as('LadderSpecs')

module.exports = {
  LadderSpecEntryModel,
  LadderSpecsModel,
  RungSpecListModel,
  VideoLadderSpecKeyModel,
  X264VideoRungSpecModel
}
