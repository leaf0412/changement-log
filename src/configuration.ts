import path from 'path';
import { findUp } from 'find-up';
import { readFileSync } from 'fs';

const CONFIGURATION_FILES = [
  '.changelog.cjs',
  '.changelog.json',
  '.changelog.js',
];

const getConfiguration = async () => {
  let config = {};
  const configPath = await findUp(CONFIGURATION_FILES);
  if (!configPath) {
    return config;
  }
  const ext = path.extname(configPath);
  if (ext === '.js' || ext === '.cjs') {
    const jsConfiguration = require(configPath);
    if (typeof jsConfiguration === 'function') {
      config = jsConfiguration();
    } else {
      config = jsConfiguration;
    }
  } else {
    try {
      config = JSON.parse(readFileSync(configPath).toString());
    } catch (err) {
      console.log(err);
    }
  }

  if (typeof config !== 'object') {
    throw Error(
      `Invalid configuration in ${configPath} provided. Expected an object but found ${typeof config}.`
    );
  }

  return config;
};

export default getConfiguration;
