const chai = require('chai')
chai.should()

// noinspection JSCheckFunctionSignatures
// chai.use(require('chai-things'))
// const expect = chai.expect

const RS = require('../../src/lib/rungSpec')
const PL = require('../../src/lib/parametricLadder')
// const {dump} = require('../../src/lib/utils')


describe('bitrateForNoUpscaleRungSpec', function () {


  it('should return expected bitrates',
    () => {
      const rs = RS.bitrateForNoUpscaleRungSpec(PL.DEFAULT.rungSpecs, 1600)
      Math.round(rs).should.equal(11969136)

    })

})
