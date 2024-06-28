const chai = require('chai')
chai.should()

// noinspection JSCheckFunctionSignatures
chai.use(require('chai-things'))

const expect = chai.expect

const kindOf = require('kind-of')
const R = require('ramda')

const M = require('../../src/lib/models')


describe('BoundedNumberModel', function () {

  const ZeroToOneInclusive = M.BoundedNumberModel(0,1,true,true).as('ZeroToOneInclusive')
  const ZeroToOneLowerInclusive = M.BoundedNumberModel(0,1,true,false).as('ZeroToOneLowerInclusive')
  const ZeroToOneUpperInclusive = M.BoundedNumberModel(0,1,false,true).as('ZeroToOneUpperInclusive')

  const ValidateZeroToOneInclusive = M.validator(ZeroToOneInclusive)
  const ValidateZeroToOneLowerInclusive = M.validator(ZeroToOneLowerInclusive)
  const ValidateZeroToOneUpperInclusive = M.validator(ZeroToOneUpperInclusive)

  it('should pass for valid inputs', function () {
    expect(()=>ZeroToOneInclusive(0)).to.not.throw()
    expect(()=>ZeroToOneInclusive(0.5)).to.not.throw()
    expect(()=>ZeroToOneInclusive(1)).to.not.throw()

    expect(()=>ZeroToOneLowerInclusive(0)).to.not.throw()
    expect(()=>ZeroToOneLowerInclusive(0.5)).to.not.throw()

    expect(()=>ZeroToOneUpperInclusive(0.5)).to.not.throw()
    expect(()=>ZeroToOneUpperInclusive(1)).to.not.throw()
  })

  it('should throw for out of range inputs', function () {
    expect(()=>ZeroToOneInclusive(-Infinity)).to.throw()
    expect(()=>ZeroToOneInclusive(-1)).to.throw()
    expect(()=>ZeroToOneInclusive(1.5)).to.throw()
    expect(()=>ZeroToOneInclusive(Infinity)).to.throw()

    expect(()=>ZeroToOneLowerInclusive(-Infinity)).to.throw()
    expect(()=>ZeroToOneLowerInclusive(-1)).to.throw()
    expect(()=>ZeroToOneLowerInclusive(1)).to.throw()
    expect(()=>ZeroToOneLowerInclusive(Infinity)).to.throw()

    expect(()=>ZeroToOneUpperInclusive(-Infinity)).to.throw()
    expect(()=>ZeroToOneUpperInclusive(-1)).to.throw()
    expect(()=>ZeroToOneUpperInclusive(0)).to.throw()
    expect(()=>ZeroToOneUpperInclusive(1.5)).to.throw()
    expect(()=>ZeroToOneUpperInclusive(Infinity)).to.throw()
  })

  it('should only return 1 error for non-numeric inputs', function () {
    let result = ValidateZeroToOneInclusive().either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal('ZeroToOneInclusive: expecting Number, got undefined')

    result = ValidateZeroToOneInclusive(null).either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal('ZeroToOneInclusive: expecting Number, got null')

    result = ValidateZeroToOneInclusive({foo: 1}).either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal('ZeroToOneInclusive: expecting Number, got Object {\n\tfoo: 1 \n}')

    result = ValidateZeroToOneInclusive('foo').either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal('ZeroToOneInclusive: expecting Number, got String "foo"')
  })

  it('should only return 1 error for out-of-range inputs', function () {
    let result = ValidateZeroToOneInclusive(-1).either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal('ZeroToOneInclusive: Value must be >= 0 and <= 1 (got: -1)')

    result = ValidateZeroToOneInclusive(2).either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal('ZeroToOneInclusive: Value must be >= 0 and <= 1 (got: 2)')

    result = ValidateZeroToOneLowerInclusive(1).either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal('ZeroToOneLowerInclusive: Value must be >= 0 and < 1 (got: 1)')

    result = ValidateZeroToOneUpperInclusive(0).either(R.identity, R.identity)
    kindOf(result).should.equal('array')
    result.length.should.equal(1)
    result[0].should.equal('ZeroToOneUpperInclusive: Value must be > 0 and <= 1 (got: 0)')

  })
})
