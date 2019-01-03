const fs = require("fs");
const util = require("util");

const writeFileAsync = util.promisify(fs.writeFile);
const readFileAsync = util.promisify(fs.readFile);

const rimrafAsync = util.promisify(require("rimraf"));
const mkdirpAsync = util.promisify(require("mkdirp"));
const { spawn } = require("child_process");

const sleep = s => new Promise(resolve => setTimeout(resolve, s * 1000));
const b64decode = b64str => Buffer.from(b64str, "base64").toString();

/**
 * Helper function to run command with arguments
 * @param  {...any} args same arguments as in child_process.spawn
 */
const run = (...args) =>
  new Promise((resolve, reject) => {
    proc = spawn(...args);
    proc.stdout.pipe(process.stdout);
    proc.stderr.pipe(process.stdout);

    proc.on("close", code => {
      if (code != 0) {
        reject(code);
      } else {
        resolve(code);
      }
    });
    proc.on("error", err => {
      reject(err);
    });
  });
/**
 * Helper function to run command with arguments without throwing errors
 * @param  {...any} args same arguments as in child_process.spawn
 */
const runSilent = async (...args) => {
  try {
    return await run(...args);
  } catch (e) {
    return e;
  }
};

/**
 * Helper function to run command with arguments with retries
 */
const runWithRetries = (delay, timeout) => async (...args) => {
  let timedOut = { value: false };
  const timeoutId = setTimeout(() => {
    timedOut.value = true;
  }, timeout * 1000);
  try {
    let rv = null;
    do {
      rv = await runSilent(...args);
      if (rv !== 0) {
        await sleep(delay);
      }
    } while (rv !== 0 && !timedOut.value);

    if (timedOut.value) {
      throw timedOut.value;
    }
    return rv;
  } finally {
    clearTimeout(timeoutId);
  }
};

module.exports = {
  sleep,
  rimrafAsync,
  mkdirpAsync,
  writeFileAsync,
  readFileAsync,
  run,
  runSilent,
  runWithRetries,
  b64decode
};
