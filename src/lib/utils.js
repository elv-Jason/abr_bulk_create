// utils.js
//
// Provides a set of computation and functional programming helpers

// --------------------------------------
// external modules
// --------------------------------------

const Fraction = require('fraction.js')
const kindOf = require('kind-of')
const R = require('ramda')
// const treis = require('treis')

// --------------------------------------
// exported functions
// --------------------------------------

// addComputedField :: String k, Object o => k -> (o -> v) -> o -> o
// Returns a shallow copy of obj with a specified property set to computeFunc(obj)
const addComputedField = R.curry(
  (fieldName, computeFunc, obj) => R.assoc(
    fieldName,
    computeFunc(obj),
    obj
  )
)

// boolArray2Number :: [Boolean] -> Integer
// Converts an array of booleans to a number by interpreting them as binary digits (most significant bits first)
// e.g. [false, false, true] -> 1, [true, false] -> 2
const boolArray2Number = boolArray => boolArray.reduce((acc, val) => acc << 1 | val, 0)

// change :: Number -> Number -> Number
// Return change between two numbers, expressed as a proportion of the first value
// e.g. returns 0 if the values are the same, 0.5 if the second value is 50% larger
// Note that 0 is invalid for oldValue
const change = R.curry(
  (oldValue, newValue) => (newValue - oldValue) / oldValue
)

// join :: a -> b -> c -> String
// Concatenate two string representations of 2 values together into a string, separated by string representation of
// supplied separator.
// Used to generate test case labels.
const join = R.curry(
  (separator, v1, v2) => `${v1}${separator}${v2}`
)


const permuterGenFn = (items1, items2, combineFn, filterFn) => {

  const _invokeIfGeneratorFunction = x => kindOf(x) === 'generatorfunction' ? x() : x

  return function* () {
    for (const item1 of _invokeIfGeneratorFunction(items1)) {
      for (const item2 of _invokeIfGeneratorFunction(items2)) {
        const result = combineFn(item1, item2)
        if (!filterFn || filterFn(result)) yield result
      }
    }
  }
}

// dump :: a -> undefined
// pretty prints JSON representation of object to console
const dump = x => console.log(JSON.stringify(x, null, 2))


// mapIndexed :: Functor f => ((a, i) → b) → f a → f b
// Takes a 2-argument compute function (value, index) and a mappable (usually an array)
// and calls function with every element of mappable paired with its index.
// Helpful when a mapping function needs access to array index for each value.
const mapIndexed = R.addIndex(R.map)

// multiplier :: Number -> Number
// Converts a proportional change to a multiplier
// e.g. 0 -> 1.0, 0.25 -> 1.25, -0.25 -> 0.75
const multiplier = changeVal => 1.0 + changeVal

// neighborsValidate :: ((a,a) -> Boolean) -> Array -> Boolean
// Returns true if all pairs of neighbors in arr return true when fed into evalFn.
// Can be used to verify ordering, e.g. if evalFn is (x,y) => x <= y then arr must be sorted ascending
const neighborsValidate = R.curry(
  (evalFn, arr) => R.find(
    pair => !evalFn(pair[0], pair[1]),
    R.aperture(2, arr)
  ) === undefined
)


// ratNumerator :: String -> Number
// Evaluates string as a rational number using fraction.js and returns denominator as a number
const ratDenominator = str => ratFromStr(str).d

// ratFromStr :: String -> Fraction
// Returns a rational (fraction.js object) created from string
const ratFromStr = str => Fraction(str)

// ratNumerator :: String -> Number
// Evaluates string as a rational number using fraction.js and returns numerator as a number
const ratNumerator = str => ratFromStr(str).n

// ratStrToNumber :: String -> Number
// Evaluates string as a rational number using fraction.js and converts to a number
const ratStrToNumber = str => ratFromStr(str).valueOf()

// roundToMultiple :: Number -> Number -> Number
// Rounds a value to nearest multiple of a specified number
const roundToMultiple = R.curry(
  (mult, val) => Math.round(val / mult) * mult
)

// roundEven :: Number -> Number
// Rounds a value to the nearest even number
// Used to ensure that calculated video dimensions are even
const roundEven = roundToMultiple(2)

// roundToPrecision :: Number -> Number -> Number
// Rounds a value to a certain number of significant digits
const roundToPrecision = R.curry(
  (sigFigs, value) => {

    // _roundToPrecisionUnsafe :: Number -> Number -> Number
    // Rounds a positive value to a given number of significant figures.
    // Does not protect against value <= 0
    const _roundToPrecisionUnsafe = (sigFigs, value) => {
      const factor = 10 ** (1 + Math.trunc(Math.log10(value)) - sigFigs)
      return Math.round(value / factor) * factor
    }

    switch (Math.sign(value)) {
    case 1:
      return _roundToPrecisionUnsafe(sigFigs, value)
    case -1:
      return -_roundToPrecisionUnsafe(sigFigs, -value)
    default:
      return 0
    }
  }
)

// snapWithinTolerance :: Number -> Number -> Number -> Number
// Returns returns a standard value if testValue is within a proportional tolerance, measured relative to a
// standard value, otherwise returns testValue unchanged
const snapWithinTolerance = (tolerance, standardValue, testValue) =>
  Math.abs(change(standardValue, testValue)) <= tolerance ?
    standardValue :
    testValue

// swapFields :: String -> String -> Object -> Object
// returns a shallow copy of object with the values of 2 fields swapped
const swapFields = R.curry(
  (fieldName1, fieldName2, obj) => R.assoc(
    fieldName1,
    obj[fieldName2],
    R.assoc(
      fieldName2,
      obj[fieldName1],
      obj)
  )
)

// const spy = fn => treis(fn)

const tap = R.curry(
  (label, x) => {
    console.log(`TAP: ${label} ----------`)
    dump(x)
    console.log('----------')
    return x
  }
)

const throwError = message => {
  throw Error(message)
}

const truthTable = (boolArray, ...choices) => choices[boolArray2Number(boolArray)]


module.exports = {
  addComputedField,
  change,
  join,
  dump,
  mapIndexed,
  multiplier,
  neighborsValidate,
  permuterGenFn,
  ratDenominator,
  ratFromStr,
  ratNumerator,
  ratStrToNumber,
  roundEven,
  roundToMultiple,
  roundToPrecision,
  snapWithinTolerance,
  // spy,
  swapFields,
  tap,
  throwError,
  truthTable
}
