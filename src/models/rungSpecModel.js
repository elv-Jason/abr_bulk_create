// rungSpecModel.js
// Data validator for Parametric Ladder's rungSpecs elements


// --------------------------------------
// external modules
// --------------------------------------

const kindOf = require('kind-of')
const R = require('ramda')

// --------------------------------------
// internal modules
// --------------------------------------

const M = require('../lib/models')
const {neighborsValidate} = require('../lib/utils')

// --------------------------------------
// internal functions
// --------------------------------------

// bitrate1_GTE_bitrate2 :: RungSpec -> RungSpec -> Boolean
// Returns true if first rung spec has bitrate >= second rung spec bitrate
const bitrate1_GTE_bitrate2 = (rs1, rs2) => rs1.bitrate >= rs2.bitrate

// dim1_GTE_dim2 :: RungSpec -> RungSpec -> Boolean
// Returns true if first rung spec has dim >= second rung spec dim
const dim1_GTE_dim2 = (rs1, rs2) => rs1.dim >= rs2.dim

// isNotOutOfOrderByDim :: a -> Boolean
// Returns false (failing validation) ONLY if a is an array AND a is not in descending order by dim.
// Returns true if a is an array and is in order.
// Returns true if a is not an array
// (See isNotEmptyArray() in models.js for background)
const isNotOutOfOrderByDim = rungSpecList =>
  !(kindOf(rungSpecList) === 'array' && !neighborsValidate(dim1_GTE_dim2, rungSpecList))

// isNotOutOfOrderByBitrate :: a -> Boolean
// Returns false (failing validation) ONLY if a is an array AND a is not in descending order by bitrate.
// Returns true if a is an array and is in order.
// Returns true if a is not an array
// (See isNotEmptyArray() in models.js for background)
const isNotOutOfOrderByBitrate = rungSpecList =>
  !(kindOf(rungSpecList) === 'array' && !neighborsValidate(bitrate1_GTE_bitrate2, rungSpecList))

// --------------------------------------
// exported functions
// --------------------------------------

const RungSpecModel = M.SealedModel({
  dim: M.PositiveIntegerModel,
  bitrate: M.PositiveIntegerModel
}).as('RungSpec')

const RungSpecListModel = M.NonEmptyArrayModel(RungSpecModel).extend()
  .assert(
    isNotOutOfOrderByDim,
    R.always('RungSpecs must be sorted (descending) by dim')
  )
  .assert(
    isNotOutOfOrderByBitrate,
    R.always('RungSpecs must be sorted (descending) by bitrate')
  )
  .as('RungSpecList')

module.exports = {
  RungSpecModel,
  RungSpecListModel
}
