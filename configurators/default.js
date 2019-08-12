const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const fser = require('fser');

const FILES = [
  'cicd.yml',
  'cicd.yaml',
];

module.exports = function () {
  return async ({ workDir }) => {
    const files = await fser.readdir(fs, workDir);
    const configFile = FILES.find(f => files.includes(f));
    if (!configFile) {
      return;
    }

    const config = await loadYml(path.join(workDir, configFile));
    if (!config.version) {
      throw new Error('CICD configuration must have version');
    }

    return config;
  };
};

async function loadYml (filepath) {
  const content = await new Promise((resolve, reject) => {
    try {
      fs.readFile(filepath, (err, content) => {
        if (err) {
          return reject(err);
        }

        resolve(content);
      });
    } catch (err) {
      reject(err);
    }
  });

  return yaml.safeLoad(content);
}
