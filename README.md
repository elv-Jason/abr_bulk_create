# abr_bulk_create

A Package for creating ABR (Adjustable Bitrate) Profiles to use when ingesting large number of media into the Eluvio Content Fabric. 

The video bitrate ladder in the generated profile is based on:

* The properties of the video to ingest
* A parametric ladder specification
* A list of standard aspect ratios to (optionally) conform to

The audio bitrate ladder is fixed based on the number of channels in the audio stream.

**NOTE:** This package currently does not support working with profiles for x265 (hevc) mezzanines.

## Installation

#### Install from NPM:

```
npm install --save @eluvio/elv-abr-profile
npm install fluent-ffmpeg
npm install crocks
```

## Usage

Generate an ABR Profile based on Production Master metadata and default bitrate ladder / standard aspect ratio list

Combine all the necessary ABR specs for ingesting all the videos within a single directory (you can use a single ABR profile for ingesting all the content). It might be necessary to clear out the ABR output periodically if there is an excessive amount of content.

## Command
--directoryPath: Path to the directory where the video contents are located

--jsonFilePath: Path to the output JSON file

```
node bulk_abr_create.js --directoryPath --jsonFilePath
```
## SampleOutput 
(Stored as abr_profile.json within the current directory, which can be referenced in @eluvio/elv-utils-js/BulkIngest.js. for the actual Bulk Ingestion)

```json
{
  "ok": true,
  "result": {
    "drm_optional": true,
    "store_clear": false,
    "ladder_specs": {
      "{\"media_type\":\"audio\",\"channels\":1}": {
        "rung_specs": [
          {
            "bit_rate": 192000,
            "media_type": "audio",
            "pregenerate": true
          }
        ]
      },
      "{\"media_type\":\"audio\",\"channels\":2}": {
        "rung_specs": [
          {
            "bit_rate": 256000,
            "media_type": "audio",
            "pregenerate": true
          }
        ]
      },
      "{\"media_type\":\"audio\",\"channels\":6}": {
        "rung_specs": [
          {
            "bit_rate": 384000,
            "media_type": "audio",
            "pregenerate": true
          }
        ]
      },
      "{\"media_type\":\"video\",\"aspect_ratio_height\":9,\"aspect_ratio_width\":16}": {
        "rung_specs": [
          {
            "bit_rate": 12600000,
            "height": 2160,
            "media_type": "video",
            "pregenerate": true,
            "width": 3840
          },
          {
            "bit_rate": 10400000,
            "height": 1440,
            "media_type": "video",
            "pregenerate": false,
            "width": 2560
          },
          {
            "bit_rate": 8550000,
            "height": 1080,
            "media_type": "video",
            "pregenerate": false,
            "width": 1920
          },
          {
            "bit_rate": 4050000,
            "height": 720,
            "media_type": "video",
            "pregenerate": false,
            "width": 1280
          },
          {
            "bit_rate": 1580000,
            "height": 480,
            "media_type": "video",
            "pregenerate": false,
            "width": 854
          },
          {
            "bit_rate": 729000,
            "height": 360,
            "media_type": "video",
            "pregenerate": false,
            "width": 640
          },
          {
            "bit_rate": 450000,
            "height": 240,
            "media_type": "video",
            "pregenerate": false,
            "width": 426
          }
        ]
      }
    },
    "playout_formats": {
      "dash-widevine": {
        "drm": {
          "content_id": "",
          "enc_scheme_name": "cenc",
          "license_servers": [],
          "type": "DrmWidevine"
        },
        "protocol": {
          "min_buffer_length": 2,
          "type": "ProtoDash"
        }
      },
      "hls-aes128": {
        "drm": {
          "enc_scheme_name": "aes-128",
          "type": "DrmAes128"
        },
        "protocol": {
          "type": "ProtoHls"
        }
      },
      "hls-fairplay": {
        "drm": {
          "enc_scheme_name": "cbcs",
          "license_servers": [],
          "type": "DrmFairplay"
        },
        "protocol": {
          "type": "ProtoHls"
        }
      },
      "hls-sample-aes": {
        "drm": {
          "enc_scheme_name": "cbcs",
          "type": "DrmSampleAes"
        },
        "protocol": {
          "type": "ProtoHls"
        }
      },
      "dash-clear": {
        "drm": null,
        "protocol": {
          "min_buffer_length": 2,
          "type": "ProtoDash"
        }
      },
      "hls-clear": {
        "drm": null,
        "protocol": {
          "type": "ProtoHls"
        }
      }
    },
    "segment_specs": {
      "audio": {
        "segs_per_chunk": 15,
        "target_dur": 2
      },
      "video": {
        "segs_per_chunk": 15,
        "target_dur": 2
      }
    }
  }
}
```


