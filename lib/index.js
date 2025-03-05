import debug from "debug";
import { dirname, normalize } from "node:path";
import { fileURLToPath } from 'node:url';

import packageJson from '../package.json';

function error(msg, code) {
  var err = new Error(msg);
  err.code = code;

  return err;
}

// Promise-based public endpoint
export default function analyze(image, browserData = {}, options = {}) {

  const defaultOptions = {
    jpgQuality: 85,
    pngQuality: 90, // PNG are often used for pixel-perfect results, so let's not reduce too much
    webpQuality: 82, // See https://www.industrialempathy.com/posts/avif-webp-quality-settings)
    avifQuality: 64, // See https://www.industrialempathy.com/posts/avif-webp-quality-settings)
    gifQuality: 3, // See https://github.com/imagemin/imagemin-gifsicle
    removeBuffersFromTransforms: true // Removes/keeps the transformed images from the response
  };

  debug("Provided options: %j", options);

  if (typeof options === 'object') {
    // Overwrite defaults with provided options
    options = {...defaultOptions, ...options};
  }

  debug("Options + defaults: %j", options);

  return new Promise(async (resolve, reject) => {

    if (!Buffer.isBuffer(image) && typeof image !== "string") {
      reject(
        error(
          "image parameter passed is not a buffer or a string!",
          analyze.EXIT_IMAGE_PASSED_IS_INVALID
        )
      );
      return;
    }

    const ModulesRunner = require("./modulesRunner");
    const instance = new ModulesRunner(options);
    const res = await instance.startAnalysis(image, browserData);

    // error handling
    if (res instanceof Error) {
      debug("Rejecting a promise with an error: " + res);
      reject(res);
      return;
    }

    // remove bodies from results
    if (options.removeBuffersFromTransforms) {
      Object.keys(res.transforms).forEach((name) => delete res.transforms[name].body);
    }

    // return the results
    let result = {
      generator: "analyze-image v" + VERSION,
      ...res
    };

    debug("Promise resolved");
    resolve(result);
  });
}

export const version = packageJson.version;

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = dirname(__filename); // get the name of the directory

// @see https://github.com/macbre/phantomas/issues/664
export const path = normalize(__dirname + "/..");
export const pathBin = analyze.path + "/bin/analyze-image.js";

// exit codes
export const EXIT_INVALID_OPTION = 2;
export const EXIT_EMPTY_IMAGE = 252;
export const EXIT_IMAGE_PASSED_IS_INVALID = 253;
// analyze.EXIT_URL_LOADING_FAILED = 254;
// analyze.EXIT_FILE_LOADING_FAILED = 255;
