const fs = require('fs-extra');
const path = require('path');
const yaml = require('js-yaml');

const FILES = [
  'cicd.yml',
  'cicd.yaml',
];

module.exports = function cicdResolverFactory () {
  return async function cicd (workDir) {
    const files = await fs.readdir(workDir);
    const configFile = FILES.find(f => files.includes(f));
    if (!configFile) {
      return;
    }

    const config = await loadYml(path.join(workDir, configFile));
    if (!config) {
      return;
    }

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
