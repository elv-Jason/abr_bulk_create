const chai = require('chai')
chai.should()

// noinspection JSCheckFunctionSignatures
chai.use(require('chai-things'))

const expect = chai.expect

const kindOf = require('kind-of')
const R = require('ramda')

const M = require('../../src/lib/models')
const {RungSpecModel, RungSpecListModel} = require('../../src/models/rungSpecModel')

const ValidateRungSpecModel = M.validator(RungSpecModel)
const ValidateRungSpecListModel = M.validator(RungSpecListModel)

describe('RungSpecModel', function () {

  it('should pass for valid inputs', function () {
    expect(() => RungSpecModel({
      dim: 2160,
      bitrate: 14000000
    })).to.not.throw()
  })

  it('should throw for bad inputs', function () {
    expect(() => RungSpecModel({
      dim: 0,
      bitrate: 14000000
    })).to.throw()
  })

  it('should return clear errors for out of range input', function () {
    let result = ValidateRungSpecModel(
      {
        dim: 2160,
        bitrate: 0
      }
    ).either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal('RungSpec: bitrate must be > 0 (got: 0)')

    result = ValidateRungSpecModel(
      {
        dim: 0,
        bitrate: 10
      }
    ).either(R.identity, R.identity)

    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal('RungSpec: dim must be > 0 (got: 0)')

    result = ValidateRungSpecModel(
      {
        dim: 0,
        bitrate: 0
      }
    ).either(R.identity, R.identity)

    kindOf(result).should.equal('array')
    result.length.should.equal(2)
    result[0].should.equal('RungSpec: dim must be > 0 (got: 0)')
    result[1].should.equal('RungSpec: bitrate must be > 0 (got: 0)')
  })

})

describe('RungSpecListModel', function () {

  it('should pass for valid inputs', function () {
    expect(() => RungSpecListModel([
      {
        dim: 2160,
        bitrate: 14000000
      },
      {
        dim: 1080,
        bitrate: 9500000
      }
    ])).to.not.throw()
  })

  it('should throw for bad inputs', function () {
    expect(() => RungSpecListModel([
      {
        dim: 0,
        bitrate: 14000000
      }
    ])).to.throw()
  })

  it('should return clear errors for out of range input', function () {
    let result = ValidateRungSpecListModel(
      [
        {
          dim: 2160,
          bitrate: 0
        },
        {
          dim: 1080,
          bitrate: 0
        }
      ]
    ).either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    // console.log(JSON.stringify(result,null,2))
    result.length.should.equal(2)
    result[0].should.equal('RungSpecList: Array[0].bitrate must be > 0 (got: 0)')
    result[1].should.equal('RungSpecList: Array[1].bitrate must be > 0 (got: 0)')
  })

  it('should return clear errors for out of order input', function () {
    let result = ValidateRungSpecListModel(
      [
        {
          dim: 2160,
          bitrate: 1000
        },
        {
          dim: 4080,
          bitrate: 2000
        }
      ]
    ).either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    // console.log(JSON.stringify(result,null,2))
    result.length.should.equal(2)
    result[0].should.equal('RungSpecList: RungSpecs must be sorted (descending) by dim')
    result[1].should.equal('RungSpecList: RungSpecs must be sorted (descending) by bitrate')
  })
})
