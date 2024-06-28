const chai = require('chai')
chai.should()

// noinspection JSCheckFunctionSignatures
chai.use(require('chai-things'))

const expect = chai.expect

const kindOf = require('kind-of')
const R = require('ramda')

const M = require('../../src/lib/models')
const {LadderSpecsModel, X264VideoRungSpecModel} = require('../../src/models/ladderSpecsModel')

const ValidateLadderSpecsModel = M.validator(LadderSpecsModel)
const ValidateX264VideoRungSpecModel = M.validator(X264VideoRungSpecModel)


describe('X264VideoRungSpecModel', function () {

  it('should pass for valid inputs', function () {
    expect(() => X264VideoRungSpecModel({
      bit_rate: 14000000,
      height: 2160,
      media_type: 'video',
      pregenerate: true,
      width: 3840
    })).to.not.throw()
  })

  it('should throw for bad input', function () {
    expect(() => X264VideoRungSpecModel({
      bit_rate: 0,
      height: 2160,
      media_type: 'video',
      pregenerate: true,
      width: 3840
    })).to.throw()
  })

  it('should return clear errors for out of range input', function () {
    let result = ValidateX264VideoRungSpecModel({
      bit_rate: 0,
      height: 2160,
      media_type: 'video',
      pregenerate: true,
      width: 3840
    }).either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal('X264VideoRungSpec: bit_rate must be > 0 (got: 0)')
  })
})

describe('LadderSpecsModel', function () {

  it('should pass for valid inputs', function () {
    expect(() => LadderSpecsModel({
      '{"media_type":"video","aspect_ratio_height":9,"aspect_ratio_width":16}': {
        rung_specs: [
          {
            bit_rate: 14000000,
            height: 2160,
            media_type: 'video',
            pregenerate: true,
            width: 3840
          }
        ]
      }
    })).to.not.throw()
  })

  it('should throw for bad value or key', function () {
    // bad value
    expect(() => LadderSpecsModel({
      '{"media_type":"video","aspect_ratio_height":9,"aspect_ratio_width":16}': {
        rung_specs: [
          {
            bit_rate: 0,
            height: 2160,
            media_type: 'video',
            pregenerate: true,
            width: 3840
          }
        ]
      }
    })).to.throw()

    // bad key
    expect(() => LadderSpecsModel({
      '{"media_type":"ebook","aspect_ratio_height":9,"aspect_ratio_width":16}': {
        rung_specs: [
          {
            bit_rate: 14000000,
            height: 2160,
            media_type: 'video',
            pregenerate: true,
            width: 3840
          }
        ]
      }
    })).to.throw()
  })


  it('should return clear error for bad key', function () {
    let result = ValidateLadderSpecsModel({
      '{"media_type":"eBook","aspect_ratio_height":9,"aspect_ratio_width":16}': {
        rung_specs: [
          {
            bit_rate: 14000000,
            height: 2160,
            media_type: 'video',
            pregenerate: true,
            width: 3840
          }
        ]
      }
    }).either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal('LadderSpecs: invalid property name \'{"media_type":"eBook","aspect_ratio_height":9,"aspect_ratio_width":16}\' (is not a valid LadderSpecKey)')
  })

  it('should return clear error for bad value', function () {
    let result = ValidateLadderSpecsModel({
      '{"media_type":"video","aspect_ratio_height":9,"aspect_ratio_width":16}': {
        rung_specs: [
          {
            bit_rate: 0,
            height: 2160,
            media_type: 'video',
            pregenerate: true,
            width: 3840
          }
        ]
      }
    }).either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal(
      'LadderSpecs: key \'{"media_type":"video","aspect_ratio_height":9,"aspect_ratio_width":16}\' points to a value that is an invalid LadderSpecEntry (LadderSpecEntry: rung_specs[0].bit_rate must be > 0 (got: 0))'
    )
  })
})
