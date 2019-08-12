const fs = require('fs');
const fser = require('fser');
const { Registry } = require('../registry');

const FILES = [
  'docker-compose.yml',
];

module.exports = function () {
  return async ({ workDir }) => {
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
          files: [configFile],
        },
      },
    };
  };
};
