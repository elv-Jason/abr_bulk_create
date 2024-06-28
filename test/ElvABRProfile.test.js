const chai = require('chai')
chai.should()

// noinspection JSCheckFunctionSignatures
chai.use(require('chai-things'))
const expect = chai.expect

// const R = require('ramda')

const LadderGen = require('../src/ElvABRProfile')
const {dump, ratFromStr} = require('../src/lib/utils')
const {testCaseGenerator} = require('./fixtures/testCaseGenerator')

describe('VideoLadderSpecs', function () {
  for (const testCase of testCaseGenerator(true)) {
    it(`should receive a valid test case for ${testCase.case}`, function () {
      // check aspect ratios are consistent
      expect(testCase.extras.actualAspectRatio).to.be.approximately(testCase.extras.intendedAspectRatio, 0.01 * testCase.extras.intendedAspectRatio)
      if (testCase.case.split('+').includes('VideoPortrait')) {
        expect(testCase.video.height * ratFromStr(testCase.video.sampleAspectRatio).d).to.be.greaterThan(testCase.video.width * ratFromStr(testCase.video.sampleAspectRatio).n)
        testCase.extras.actualAspectRatio.should.be.lessThan(1)
      } else {
        expect(testCase.video.height * ratFromStr(testCase.video.sampleAspectRatio).d).to.be.lessThanOrEqual(testCase.video.width * ratFromStr(testCase.video.sampleAspectRatio).n)
        testCase.extras.actualAspectRatio.should.be.greaterThanOrEqual(1)
      }
    })

    it(`should generate a valid ladder for ${testCase.case}`, function () {
      const ls = LadderGen.VideoLadderSpecs(testCase.video, testCase.ladder)
      if(!ls.ok) {
        dump(testCase)
        dump(ls.errors)
      }
      ls.ok.should.be.true

      // check that rungs are in descending order


    })
  }

  // it("should return expected values", () => {
  //
  //   shortTestCases.map(testCase => {
  //     const vProps = R.mergeRight(LadderGen.EXAMPLE_VIDEO, testCase);
  //     const pLadder = R.mergeRight(LadderGen.DEFAULT_PARAMETRIC_LADDER, testCase);
  //     const result = LadderGen.VideoABRLadder(pLadder, vProps)
  //     console.log(JSON.stringify(result));
  //     console.log(testCase.firstRungDim);
  //     let expectedVal = testCase.firstRungDim;
  //     let actual = result.height;
  //     expect(actual).to.equal(
  //       expectedVal,
  //       `expected ${expectedVal}, got ${actual} (test case: ${JSON.stringify(testCase)})`
  //     );
  //     expectedVal = testCase.firstRungDim2;
  //     actual = result.width;
  //     expect(actual).to.equal(
  //       expectedVal,
  //       `expected ${expectedVal}, got ${actual} (test case: ${JSON.stringify(testCase)})`
  //     );
  //   })
  // });

})
