const fs = require('fs');
const fser = require('fser');
const { Registry } = require('../registry');

const FILES = [
  'Dockerfile',
];

module.exports = function docker () {
  return async function docker ({ workDir }) {
    const files = await fser.readdir(fs, workDir);
    const configFile = FILES.find(f => files.includes(f));
    if (!configFile) {
      return;
    }

    return {
      version: Registry.CURRENT_VERSION,
      stages: {
        main: {
          detach: false,
          dockerfile: configFile,
        },
      },
    };
  };
};

module.exports.name = 'docker';
