//abr profile creation for bulk ingestion
//node abr_create.js --directoryPath /path/to/your/directory --jsonFilePath /path/to/your/abr_profile.json
const ABR = require('./src/ElvABRProfile');
const { dump } = require('./src/lib/utils');
const fs = require('fs').promises;
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const args = process.argv.slice(2);
const directoryArgIndex = args.indexOf('--directoryPath');
const jsonFileArgIndex = args.indexOf('--jsonFilePath');
if (directoryArgIndex === -1 || !args[directoryArgIndex + 1] || jsonFileArgIndex === -1 || !args[jsonFileArgIndex + 1]) {
  console.error('Usage: node abr_create.js --directoryPath <path_to_directory> --jsonFilePath <path_to_json_file>');
  process.exit(1);
}
const directoryPath = args[directoryArgIndex + 1];
const jsonFilePath = args[jsonFileArgIndex + 1];
const pl = ABR.DEFAULT_PARAMETRIC_LADDER;
pl.options.upscale = false;
pl.options.snapAR = false;
function extractMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
}
async function updateLadderSpecs(filePath, newEntry) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    let jsonData = JSON.parse(data);
    if (!jsonData.ladder_specs) {
      jsonData.ladder_specs = {};
    }
    Object.assign(jsonData.ladder_specs, newEntry);
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
    console.log('File updated successfully');
  } catch (error) {
    console.error('Error updating file:', error);
  }
}
async function createAbrProfile(filePath) {
  try {
    const metadata = await extractMetadata(filePath);
    const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
    const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
    const ls = ABR.VideoLadderSpecs(
      {
        height: videoStream.height,
        width: videoStream.width,
        sampleAspectRatio: '1',
        frameRate: videoStream.r_frame_rate
      },
      pl
    );
    if (!ls.ok) {
      dump(ls);
    } else {
      const result = ls.result;
      updateLadderSpecs(jsonFilePath, result);
    }
  } catch (error) {
    console.error('Error creating ABR profile:', error);
  }
}
async function iterateFiles(directoryPath) {
  try {
    const files = await fs.readdir(directoryPath);
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stat = await fs.stat(filePath);
      if (stat.isFile()) {
        await createAbrProfile(filePath);
      }
    }
    console.log('All files have been processed.');
  } catch (error) {
    console.error('Error processing files:', error);
  }
}
iterateFiles(directoryPath);
// node bulk_abr_create.js --directoryPath "/Users/jasonshin/mica-MovieCLIP/data_mp4/Demo" --jsonFilePath "./abr_profile.json"