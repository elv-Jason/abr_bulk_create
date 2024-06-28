// ElvABRProfile.js
//
// Utility to generate an ABR Profile object for a given ingest video from a parametric ladder spec and
// a list of standard aspect ratios.
//
// Also provides a default parametric ladder, default list of standard aspect ratios, and an example set of
// video properties

// --------------------------------------
// external modules
// --------------------------------------

const liftA2 = require('crocks/helpers/liftA2')
const liftA3 = require('crocks/helpers/liftA3')
const {Ok, Err} = require('crocks/Result')
const chain = require('crocks/pointfree/chain')
const R = require('ramda')

// --------------------------------------
// internal modules
// --------------------------------------

const AR = require('./lib/aspectRatio')
const ARLM = require('./models/aspectRatioListModel')
const M = require('./lib/models')
const PL = require('./lib/parametricLadder')
const PLM = require('./models/parametricLadderModel')
const LS = require('./lib/ladderSpecs')
const LSM = require('./models/ladderSpecsModel')
const V = require('./lib/videoProps')
const VPM = require('./models/videoPropsModel')

// --------------------------------------
// internal functions
// --------------------------------------

const ABR_PROFILE_TEMPLATE = {
  drm_optional: true,
  store_clear: false,
  ladder_specs: {
    '{"media_type":"audio","channels":1}': {
      rung_specs: [
        {
          bit_rate: 192000,
          media_type: 'audio',
          pregenerate: true
        }
      ]
    },
    '{"media_type":"audio","channels":2}': {
      rung_specs: [
        {
          bit_rate: 256000,
          media_type: 'audio',
          pregenerate: true
        }
      ]
    },
    '{"media_type":"audio","channels":6}': {
      rung_specs: [
        {
          bit_rate: 384000,
          media_type: 'audio',
          pregenerate: true
        }
      ]
    }
  },
  playout_formats: {
    'dash-widevine': {
      drm: {
        content_id: '',
        enc_scheme_name: 'cenc',
        license_servers: [],
        type: 'DrmWidevine'
      },
      protocol: {
        min_buffer_length: 2,
        type: 'ProtoDash'
      }
    },
    'hls-aes128': {
      drm: {
        enc_scheme_name: 'aes-128',
        type: 'DrmAes128'
      },
      protocol: {
        type: 'ProtoHls'
      }
    },
    'hls-fairplay': {
      drm: {
        enc_scheme_name: 'cbcs',
        license_servers: [],
        type: 'DrmFairplay'
      },
      protocol: {
        type: 'ProtoHls'
      }
    },
    'hls-sample-aes': {
      drm: {
        enc_scheme_name: 'cbcs',
        type: 'DrmSampleAes'
      },
      protocol: {
        type: 'ProtoHls'
      }
    },
    'dash-clear': {
      drm: null,
      protocol: {
        min_buffer_length: 2,
        type: 'ProtoDash'
      }
    },
    'hls-clear': {
      drm: null,
      protocol: {
        type: 'ProtoHls'
      }
    }
  },
  segment_specs: {
    audio: {
      segs_per_chunk: 15,
      target_dur: 2
    },
    video: {
      segs_per_chunk: 15,
      target_dur: 2
    }
  }
}

// Shorthand accessor for modifying ABR Profile ladder_specs
const LADDER_SPECS_LENS = R.lensProp('ladder_specs')

// Shorthand accessor for modifying ABR Profile playout_formats
const PLAYOUT_FORMATS_LENS = R.lensProp('playout_formats')

// Shorthand accessor for modifying ABR Profile segment_specs
const SEGMENT_SPECS_LENS = R.lensProp('segment_specs')

const _abrProfileForVariant = (prodMasterSources, prodMasterVariant, abrProfile, standardAspectRatios) => {
  // assemble videoProps from prodMaster info

  // find the (first) video stream
  let videoStreamInfo = null

  for (const streamKey in prodMasterVariant.streams) {
    const firstSource = prodMasterVariant.streams[streamKey].sources[0]
    const filePath = firstSource.files_api_path
    const streamIndex = firstSource.stream_index
    if (prodMasterSources[filePath].streams[streamIndex].type === 'StreamVideo') {
      videoStreamInfo = prodMasterSources[filePath].streams[streamIndex]
      break
    }
  }

  if (videoStreamInfo === null) {
    // return audio-only profile
    return _profileExcludeVideo(abrProfile)
  } else {
    const videoProps = {
      avgBitrate: videoStreamInfo.bit_rate,
      duration: videoStreamInfo.duration,
      frameRate: videoStreamInfo.frame_rate,
      height: videoStreamInfo.height,
      sampleAspectRatio: videoStreamInfo.sample_aspect_ratio,
      width: videoStreamInfo.width
    }

    const parametricLadder = abrProfile.video_parametric_ladder || PL.DEFAULT

    const vidLadderSpecs = _videoLadderSpecs(videoProps, parametricLadder, standardAspectRatios)

    return vidLadderSpecs.map(_mergeVidLSIntoProfile(abrProfile))
  }

}

// _assertResult :: (a -> Boolean) -> String -> a -> Result [String] | a
// Checks that testFn(value) is true. If so, returns Ok(value) else returns Err([errStr])
const _assertResult = R.curry(
  (testFn, errStr, value) => testFn(value) ? Ok(value) : Err([errStr])
)

const _mergeVidLSIntoProfile = R.curry(
  (abrProfile, vidLadderSpecs) => R.omit(
    ['video_parametric_ladder'],
    R.mergeDeepRight(
      abrProfile,
      {ladder_specs: vidLadderSpecs}
    )
  )
)

// _profileRemove :: Lens -> ([k,v] -> Boolean) -> ABRProfile -> ABRProfile
// Replaces sub-object within abrProfile with a filtered shallow copy where each [key,value] pair returns false when
// evaluated with rejectFn()
const _profileRemove = R.curry(
  (lens, rejectFn, abrProfile) => R.over(
    lens,
    R.pipe(R.toPairs, R.reject(rejectFn), R.fromPairs),
    abrProfile
  )
)

const _profileExcludeAudio = R.pipe(
  _profileRemove(
    LADDER_SPECS_LENS,
    (kvPair) => kvPair[0].includes('"media_type":"audio"')
  ),
  _profileRemove(
    SEGMENT_SPECS_LENS,
    (kvPair) => kvPair[0] === 'audio'
  ),
  _assertResult(R.pipe(R.view(LADDER_SPECS_LENS), R.keys, R.length, R.lt(0)), 'ABR Profile has no non-audio ladder_specs'),
  chain(_assertResult(R.pipe(R.view(SEGMENT_SPECS_LENS), R.keys, R.length, R.lt(0)), 'ABR Profile has no non-audio segment_specs'))
)

const _profileExcludeClear = R.pipe(
  _profileRemove(
    PLAYOUT_FORMATS_LENS,
    (kvPair) => R.isNil(kvPair[1].drm)
  ),
  _assertResult(R.pipe(R.view(PLAYOUT_FORMATS_LENS), R.keys, R.length, R.lt(0)), 'ABR Profile has no non-clear playout_formats')
)

const _profileExcludeDRM = R.pipe(
  _profileRemove(
    PLAYOUT_FORMATS_LENS,
    (kvPair) => !R.isNil(kvPair[1].drm)
  ),
  _assertResult(R.pipe(R.view(PLAYOUT_FORMATS_LENS), R.keys, R.length, R.lt(0)), 'ABR Profile has no non-DRM playout_formats')
)

const _profileExcludeVideo = R.pipe(
  _profileRemove(
    LADDER_SPECS_LENS,
    (kvPair) => kvPair[0].includes('\\"media_type\\":\\"video\\"')
  ),
  _profileRemove(
    SEGMENT_SPECS_LENS,
    (kvPair) => kvPair[0] === 'video'
  ),
  _assertResult(R.pipe(R.view(LADDER_SPECS_LENS), R.keys, R.length, R.lt(0)), 'ABR Profile has no non-video ladder_specs'),
  chain(_assertResult(R.pipe(R.view(SEGMENT_SPECS_LENS), R.keys, R.length, R.lt(0)), 'ABR Profile has no non-video segment_specs'))
)

const _resultToPOJO = result => result.either(
  errVal => Object({ok: false, errors: R.uniq(R.flatten(errVal.map(R.split('\n'))))}),
  okVal => Object({ok: true, result: okVal})
)

const _videoLadderSpecs = (videoProps, parametricLadder, standardAspectRatios) => {
  const checkedVideoProps = M.validator(VPM.VideoPropsModel)(videoProps)
  const checkedParametricLadder = M.validator(PLM.ParametricLadderModel)(parametricLadder)
  const checkedStandardAspectRatios = M.validator(ARLM.LandscapeAspectRatioListModel)(standardAspectRatios)

  return liftA2(
    LS.fromParametricLadder,
    checkedVideoProps,
    liftA3(
      PL.computeValues,
      checkedStandardAspectRatios,
      checkedParametricLadder,
      checkedVideoProps
    )
  ).chain(M.validator(LSM.LadderSpecsModel))
}

// --------------------------------------
// exported functions
// --------------------------------------

const ABRProfileForVariant = (prodMasterSources, prodMasterVariant, abrProfile = DEFAULT_PARAMETRIC_ABR_PROFILE, standardAspectRatios = AR.STANDARDS) =>
  _resultToPOJO(
    _abrProfileForVariant(prodMasterSources, prodMasterVariant, abrProfile, standardAspectRatios)
  )


const DEFAULT_PARAMETRIC_ABR_PROFILE = R.mergeDeepRight(
  ABR_PROFILE_TEMPLATE,
  {video_parametric_ladder: PL.DEFAULT}
)

const ProfileExcludeAudio = abrProfile => _resultToPOJO(_profileExcludeAudio(abrProfile))

const ProfileExcludeClear = abrProfile => _resultToPOJO(_profileExcludeClear(abrProfile))

const ProfileExcludeDRM = abrProfile => _resultToPOJO(_profileExcludeDRM(abrProfile))

const ProfileExcludeVideo = abrProfile => _resultToPOJO(_profileExcludeVideo(abrProfile))


// VideoLadderSpecs :: VideoProps => ParametricLadder => AspectRatioList => Object
//
// Tries to prepare an object with only a 'ladder_specs' property with a single entry (with key specifically
// for aspect ratio computed from videoProps), suitable for merging into an ABR Profile.
//
// If the preparation succeeds, then returns:
//   {
//      ok: true,
//      result: {ladder_specs: OBJECT_WITH_1_VIDEO_LADDER_SPEC}
//   }
//
// If the preparation fails, then returns:
//   {
//      ok: false,
//      errors: ARRAY_OF_ERROR_MESSAGES
//   }
//
const VideoLadderSpecs = (videoProps = V.EXAMPLE, parametricLadder = PL.DEFAULT, standardAspectRatios = AR.STANDARDS) =>
  _resultToPOJO(
    _videoLadderSpecs(videoProps, parametricLadder, standardAspectRatios)
  )

module.exports = {
  ABRProfileForVariant,
  DEFAULT_PARAMETRIC_ABR_PROFILE,
  DEFAULT_PARAMETRIC_LADDER: PL.DEFAULT,
  DEFAULT_STANDARD_ASPECT_RATIOS: AR.STANDARDS,
  DEFAULT_VIDEO_PROPERTIES: V.EXAMPLE,
  ProfileExcludeAudio,
  ProfileExcludeClear,
  ProfileExcludeDRM,
  ProfileExcludeVideo,
  VideoLadderSpecs
}
