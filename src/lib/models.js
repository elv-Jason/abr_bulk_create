// models.js
//
// Provides functions for creating data structure validators (ObjectModel models, see http://objectmodel.js.org/)

// --------------------------------------
// external modules
// --------------------------------------

const util = require('util')

const {DateTime} = require('luxon')
const Fraction = require('fraction.js')
const kindOf = require('kind-of')
const {Ok, Err} = require('crocks/Result')
const OM = require('objectmodel')
const R = require('ramda')

// --------------------------------------
// internal modules
// --------------------------------------

const {truthTable} = require('./utils')

// --------------------------------------
// internal functions
// --------------------------------------

const REGEX_FRACTION = /^[0-9]+(\/[1-9][0-9]*)?$/

// First-pass validator for timestamps in format like "2022-04-09T05:09:13Z"
// (use datetime library to validate that MM-DD and hh:mm:ss are sensible
const REGEX_UTC_TIMESTAMP = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/

const fracStrComparator = R.comparator(
  (str1, str2) => Fraction(str1).compare(Fraction(str2)) < 0
)

const numComparator = R.comparator(R.lt)


// assertBounded :: Model -> a -> a -> Boolean -> Boolean -> [(a -> Boolean), String]
// Returns a pair [assertion function, failure message] for use (via JavaScript spread syntax)
// in objectmodel .assert() call, e.g. .assert(...assertBounded(NumberModel, 0, 1, true, true))
// The resulting assertion will check that input is a valid instance of the specified model, then
// check that the value satisfies the specified bounds.
const assertBounded = (model, lowerBound, upperBound, lowerInclusive, upperInclusive, comparatorFn = numComparator) => [
  validateThenAssertTrue(
    model,
    truthTable(
      [R.isNil(lowerBound), R.isNil(upperBound)],
      boundedBetween(lowerBound, upperBound, lowerInclusive, upperInclusive, comparatorFn), // false,false: both bounds present
      boundedLower(lowerBound, lowerInclusive, comparatorFn), // false,true: only check lower bound
      boundedUpper(upperBound, upperInclusive, comparatorFn), // true, false: only check upper bound
      R.T // true,true: no bounds passed in, number always valid (allowed for convenience)
    )
  ),
  truthTable(
    [R.isNil(lowerBound), R.isNil(upperBound)],
    boundedBetweenMsg(lowerBound, upperBound, lowerInclusive, upperInclusive), // false,false: both bounds present
    boundedLowerMsg(lowerBound, lowerInclusive), // false,true: lower bound only
    boundedUpperMsg(upperBound, upperInclusive), // true, false: upper bound only
    '' // true,true: no bounds passed in, number always valid (allowed for convenience)
  )
]


const assertMatchesRegex = regex => [
  validateThenAssertTrue(StringModel, regex.test.bind(regex)), // see https://stackoverflow.com/a/20579046
  failingRegexCheckErrMsg(regex)
]

const assertValidDatetimeString = () => [
  validateThenAssertTrue(NonBlankStringModel, (str) => DateTime.fromISO(str).invalid === null),
  assertionErrMsg('is not a valid datetime string')
]

// TODO: refactor to check values and keys in same loop (and  construct error message as well)
// to avoid repeated iteration of checkFn

// assertObjectKeysValid :: ObjectModel -> [(a -> Boolean), String | (Object -> Object -> String)]
// Returns a pair [assertion function, failure message string or function] for use (via JavaScript spread syntax)
// in objectmodel .assert() call, e.g. .assert(...assertObjectKeysValid(StringModel))
// The resulting assertion will check that input is an object, then
// check that all the object's keys return true values when passed to isValid(keyModel)
const assertObjectKeysValid = keyModel =>
  R.isNil(keyModel) ?
    [R.T, ''] : // no keyModel passed in, all keys valid
    [
      isNotObjectWithBadKey(keyModel),
      failingKeyErrMsg(keyModel)
    ]

// TODO: refactor to check values and keys in same loop (and  construct error message as well)
// to avoid repeated iteration of checkFn

// assertObjectValuesValid :: ObjectModel -> [(a -> Boolean), String | (Object -> Object -> String)]
// Returns a pair [assertion function, failure message string or function] for use (via JavaScript spread syntax)
// in objectmodel .assert() call, e.g. .assert(...assertObjectValuesValid(PositiveIntegerModel))
// The resulting assertion will check that input is an object, then
// check that all the object's values return truthy values when passed to checkFn
const assertObjectValuesValid = valueModel =>
  R.isNil(valueModel) ?
    [R.T, ''] : // no valueModel passed in, all values valid
    [
      isNotObjectWithBadValue(valueModel),
      failingValueErrMsg(valueModel)
    ]

// boundedBetween :: a -> a -> Boolean -> Boolean -> a -> Boolean
// Returns true if value satisfies specified bounds, false otherwise
const boundedBetween = R.curry(
  (lowerBound, upperBound, lowerInclusive, upperInclusive, comparatorFn, value) =>
    boundedLower(lowerBound, lowerInclusive, comparatorFn, value) &&
    boundedUpper(upperBound, upperInclusive, comparatorFn, value)
)

// boundedBetweenMsg :: a -> a -> Boolean -> Boolean -> a -> String
// Returns error message string for use with a failed boundedBetween() check
const boundedBetweenMsg = (lowerBound, upperBound, lowerInclusive, upperInclusive) =>
  assertionErrMsg(
    `must be ${(lowerInclusive ? '>=' : '>')} ${lowerBound} and ${(upperInclusive ? '<=' : '<')} ${upperBound}`
  )

// boundedLower :: a -> Boolean -> a -> Boolean
// Returns true if value satisfies specified bound, false otherwise
const boundedLower = R.curry(
  (lowerBound, inclusive, comparatorFn, value) => comparatorFn(lowerBound, value) < (inclusive ? 1 : 0)
)

// boundedLowerMsg :: a -> Boolean -> a -> String
// Returns error message string for use with a failed boundedLower() check
const boundedLowerMsg = (lowerBound, inclusive) => assertionErrMsg(
  `must be ${(inclusive ? '>=' : '>')} ${lowerBound}`
)

// boundedUpper :: a -> Boolean -> a -> Boolean
// Returns true if value satisfies specified bound, false otherwise
const boundedUpper = R.curry(
  (upperBound, inclusive, comparatorFn, value) => comparatorFn(value, upperBound) < (inclusive ? 1 : 0)
)

// boundedUpperMsg :: a -> Boolean -> a -> String
// Returns error message string for use with a failed boundedUpper() check
const boundedUpperMsg = (upperBound, inclusive) => assertionErrMsg(
  `must be ${(inclusive ? '<=' : '<')} ${upperBound}`
)

// failingKey :: ObjectModel -> Object -> String
// Iterates over object properties and returns first property name (key) where isValid(keyModel) returns false
const failingKey = R.curry(
  (keyModel, obj) => R.find(R.compose(R.not, isValid(keyModel)), R.keys(obj))
)

// failingKeyErrMsg :: ObjectModel -> Object -> String)
// Returns a function that can be used in .assert() to construct a validation error message containing the bad key
const failingKeyErrMsg = keyModel =>
  // eslint-disable-next-line no-unused-vars
  (result, value) => `invalid property name '${failingKey(keyModel, value)}' (is not a valid ${keyModel.name})`


// failingRegexCheckErrMsg :: ObjectModel -> Object -> String)
// Returns a function that can be used in .assert() to construct a validation error message containing the bad value
const failingRegexCheckErrMsg = regex =>
  (result, value, name) =>
    `${name || 'String'}: '${value}' is not in valid format or contains illegal characters (must match regular expression: ${regex})`


// failingValue :: ObjectModel -> Object -> (k, v) | undefined
// Iterates over object properties and returns first value where isValid(valueModel) is false
const failingValue = R.curry(
  (valueModel, obj) => R.find(
    R.compose(R.not, isValid(valueModel), R.last), R.toPairs(obj))
)

// failingValueErrMsg :: ObjectModel -> Object -> String)
// Returns a function that can be used in .assert() to construct a validation error message containing the bad value
const failingValueErrMsg = valueModel =>
  (result, value) => { // Note: objectmodel.js err msg call actually passes 3 args (result, value, name)
    return `key '${
      failingValue(valueModel, value)[0]
    }' points to a value that is an invalid ${valueModel.name} (${
      validator(valueModel)(failingValue(valueModel, value)[1]).either(R.join('\n'), R.identity)
    })`
  }


// isNotEmptyArray :: a -> Boolean
// Returns false (failing validation) ONLY if x is an array AND x is empty.
// Returns true if x is an array and is not empty.
// Returns true if x is not an array
//
// Used to short circuit 'not empty' validation if a non-array is passed in.
// Cannot use validateThenAssertTrue(ArrayModel, checkFn) due to idiosyncrasies of objectmodel's ArrayModel constructor
// (ArrayModel(undefined) is a valid call)
const isNotEmptyArray = x => !(kindOf(x) === 'array' && x.length === 0)

// isNotObjectWithBadKey :: ObjectModel -> (Object -> Boolean)
// Returns false (failing validation) ONLY if x is an object AND x has a bad key (validator(keyModel) returns Err)
// Returns true if x is an object and all keys are good
// Returns true if x is not an object
//
// Used to short circuit key validation if a non-object is passed in.
const isNotObjectWithBadKey = keyModel => x =>
  !(kindOf(x) === 'object' && failingKey(keyModel, x) !== undefined)

// isNotObjectWithBadValue :: (a -> Boolean) -> (Object -> Boolean)
// Returns false (failing validation) ONLY if x is an object AND x has a bad value (checkFn(value) is falsy)
// Returns true if x is an object and all values are good (checkFn(value) is truthy).
// Returns true if x is not an object
//
// Used to short circuit value validation if a non-object is passed in.
// Cannot use validateThenAssertTrue(ObjectModel, checkFn) due to idiosyncrasies of objectmodel's ObjectModel constructor
// (ObjectModel(undefined) is a valid call)
// Also this allows checkFn to be defined to check only a single value and not need to handle iteration
const isNotObjectWithBadValue = checkFn => x =>
  !(kindOf(x) === 'object' && failingValue(checkFn, x) !== undefined)


// --------------------------------------
// exported functions
// --------------------------------------

// EXPORTED HELPER FUNCTIONS
// Note that these functions are placed first (out of alphabetical order) because any models before them will generate
// a "Cannot access 'X' before initialization" error if they try to use them

// assertionErrMsg :: String -> (String -> a -> String -> String)
// Returns a function that can be used in .assert() to construct a validation error message containing the bad value
// and (if available) field name
const assertionErrMsg = msg =>
  (result, value, name) => [
    name === null ?
      'Value' :
      name, //`'${R.last(name.split('.'))}'`,
    msg,
    `(got: ${util.format(value)})`
  ].join(' ')

// isValid :: ObjectModel -> a -> Boolean
// Returns true if input passes model validation, false otherwise
const isValid = R.curry(
  (model, input) => validator(model)(input).either(R.F, R.T)
)

const validateGTE = R.curry(
  (fieldName1, fieldName2, allowMissingValues, comparatorFn, input) =>
    (allowMissingValues && (input[fieldName1] === undefined || input[fieldName2] === undefined)) ||
    comparatorFn(input[fieldName1], input[fieldName2]) > -1
)

const validateGTE_withMessage = (fieldName1, fieldName2, allowMissingValues, comparatorFn, msgPrefix = '') =>
  [
    validateGTE(fieldName1, fieldName2, allowMissingValues, comparatorFn),
    R.always(`${msgPrefix} ${fieldName1} must be >= ${fieldName2}`)
  ]


// validateThenAssertFalse :: ObjectModelDef -> (a -> Boolean) -> a
// Returns a function that will check that input is valid for a model first before checking that invertedAssertFn
// is false.
// Used to short-circuit validations for a (different, more restrictive) model so that more restrictive condition
// failure is not included in validation error list if input does not even meet lesser requirements.
const validateThenAssertFalse = R.curry(
  (model, invertedAssertFn, input) =>
    !(isValid(model, input) && invertedAssertFn(input))
)

// validateThenAssertTrue :: ObjectModelDef -> (a -> Boolean) -> a
// Returns a function that will check that input is valid for a model first before checking that assertFn
// is true.
// Used to short-circuit validations for a (different, more restrictive) model so that more restrictive condition
// failure is not included in validation error list if input does not even meet lesser requirements.
const validateThenAssertTrue = R.curry(
  (model, assertFn, input) =>
    !(
      isValid(model, input) && !assertFn(input)
    )
)


// validator :: Model -> a -> Err Array | Ok VideoPropsModel
// Returns a function to use for validation, that returns a crocks Result object that is either an Err (wrapping list
// of errors) if validation failed or an Ok (wrapping objectmodel.js instance) if validation succeeded
const validator = model => input => {
  // console.log(`VALIDATOR: ${model.name}`)
  let foundErrors = []
  const errorCollector = errors => errors.forEach(
    e => foundErrors.push(R.assoc('message', `${model.name}: ${e.message}`, e))
  )
  return model.test(input, errorCollector) ?
    Ok(model(input)) :
    Err(foundErrors.map(R.prop('message')))
}


// END OF EXPORTED HELPER FUNCTIONS


// MODELS
// Note that these are listed in roughly in dependency order rather than alphabetical order, to avoid
// "Cannot access 'X' before initialization" errors. To aid legibility and navigation, related models are grouped
// together.

// Numbers
//------------

const NumberModel = OM.BasicModel(Number).as('Number')

// noinspection JSCheckFunctionSignatures
const BoundedNumberModel = (lowerBound, upperBound, lowerInclusive, upperInclusive) => NumberModel
  .extend()
  .assert(...assertBounded(NumberModel, lowerBound, upperBound, lowerInclusive, upperInclusive))
  .as('BoundedNumber')

// NonNegativeNumber :: a -> NonNegativeNumberModel a | *exception*
// Returns either an ObjectModel containing a non-negative number or throws an exception
const NonNegativeNumberModel = BoundedNumberModel(0, null, true, null)
  .extend()
  .as('NonNegativeNumber')

// PositiveNumber :: a -> PositiveNumberModel a | *exception*
// Returns either an ObjectModel containing a positive number or throws an exception
const PositiveNumberModel = BoundedNumberModel(0, null, false, null)
  .extend()
  .as('PositiveNumber')

// Integers
//------------

const IntegerModel = NumberModel
  .extend()
  .assert(
    validateThenAssertTrue(NumberModel, n => Number.isInteger(n)),
    assertionErrMsg('must be an integer')
  ).as('Integer')

// noinspection JSCheckFunctionSignatures
const BoundedIntegerModel = (lowerBound, upperBound, lowerInclusive, upperInclusive) => NumberModel
  .extend()
  .assert(...assertBounded(IntegerModel, lowerBound, upperBound, lowerInclusive, upperInclusive))
  .as('BoundedInteger')

// NonNegativeInteger :: a -> NonNegativeIntegerModel a | *exception*
// Returns either an ObjectModel containing a positive integer or throws an exception
const NonNegativeIntegerModel = BoundedIntegerModel(0, null, true, null)
  .extend()
  .as('NonNegativeInteger')


// PositiveIntegerModel :: a -> PositiveIntegerModel a | *exception*
// Returns either an ObjectModel containing a positive integer or throws an exception
const PositiveIntegerModel = BoundedIntegerModel(0, null, false, null)
  .extend()
  .as('PositiveInteger')


// Strings
//------------

const StringModel = OM.BasicModel(String)

const NonBlankStringModel = StringModel
  .extend()
  .assert(
    validateThenAssertFalse(StringModel, s => s.trim().length === 0),
    assertionErrMsg('must not be a blank string')
  ).as('NonBlankString')

const FractionStringModel = NonBlankStringModel.extend()
  .assert(
    str => REGEX_FRACTION.exec(str) !== null,
    assertionErrMsg('must be a string representing a whole number or fraction')
  )
  .as('FractionString')


// noinspection JSCheckFunctionSignatures
const RegexMatchedStringModel = regex => StringModel
  .extend()
  .assert(...assertMatchesRegex(regex))
  .as('RegexMatchedString')

// noinspection JSCheckFunctionSignatures
const UTCTimestampStringModel = RegexMatchedStringModel(REGEX_UTC_TIMESTAMP)
  .extend()
  .assert(...assertValidDatetimeString())
  .as('UTCTimestampString')


// noinspection JSCheckFunctionSignatures
const BoundedFractionStringModel = (lowerBound, upperBound, lowerInclusive, upperInclusive) => FractionStringModel
  .extend()
  .assert(...assertBounded(FractionStringModel, lowerBound, upperBound, lowerInclusive, upperInclusive, fracStrComparator))
  .as('BoundedFractionString')

const PositiveFractionStringModel = BoundedFractionStringModel(0, null, false, null)

// Arrays
//------------

const ArrayModel = def => new OM.ArrayModel(def)

const NonEmptyArrayModel = def => ArrayModel(def)
  .extend()
  .assert(
    isNotEmptyArray,
    assertionErrMsg('must not be an empty array')
  ).as('ArrayNotEmpty')

// Objects
//------------

const ObjectModel = def => new OM.ObjectModel(def)

// noinspection JSCheckFunctionSignatures
const KVMapModel = ({keyModel, valueModel}) =>
  OM.BasicModel(Object)
    .extend()
    .assert(...assertObjectKeysValid(keyModel))
    .assert(...assertObjectValuesValid(valueModel))

// SealedModel :: ObjectModel => (object -> SealedObjectModel o | *exception*)
// Returns a function that can be used as a model that refuses unrecognized properties
// (i.e. only fields defined within ObjectModelDefinition)
// Note that ramda's assoc function (among others) will return a plain object rather than an objectmodel instance,
// and so will not preserve this protection on the object it returns.
const SealedModel = modelDef => {
  let model = ObjectModel(modelDef)
  model.sealed = true
  model.extend = () => {
    throw new Error('Sealed models cannot be extended')
  }

  const checkUndeclaredProps = (obj, def, undeclaredProps, path) => {
    Object.keys(obj).forEach(key => {
      let val = obj[key],
        subpath = path ? path + '.' + key : key
      if (!Object.prototype.hasOwnProperty.call(def, key)) {
        undeclaredProps.push(subpath)
      } else if (
        val &&
        typeof val === 'object' &&
        Object.getPrototypeOf(val) === Object.prototype
      ) {
        checkUndeclaredProps(val, def[key], undeclaredProps, subpath)
      }
    })
  }

  return model.assert(
    function hasNoUndeclaredProps(obj) {
      if (!model.sealed) return true
      let undeclaredProps = []
      checkUndeclaredProps(obj, this.definition, undeclaredProps)
      return undeclaredProps.length === 0 ? true : undeclaredProps
    },
    undeclaredProps => `Unrecognized property name(s): ${undeclaredProps}`
  )
}

module.exports = {
  ArrayModel,
  assertionErrMsg,
  BoundedFractionStringModel,
  BoundedIntegerModel,
  BoundedNumberModel,
  FractionStringModel,
  fracStrComparator,
  isValid,
  KVMapModel,
  NonBlankStringModel,
  NonEmptyArrayModel,
  NonNegativeIntegerModel,
  NonNegativeNumberModel,
  numComparator,
  ObjectModel,
  PositiveFractionStringModel,
  PositiveIntegerModel,
  PositiveNumberModel,
  RegexMatchedStringModel,
  SealedModel,
  StringModel,
  UTCTimestampStringModel,
  validateGTE,
  validateGTE_withMessage,
  validateThenAssertFalse,
  validateThenAssertTrue,
  validator
}
