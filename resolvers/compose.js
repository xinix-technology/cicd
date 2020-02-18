const fs = require('fs-extra');

const FILES = [
  'docker-compose.yml',
  'docker-compose.yaml',
];

module.exports = function () {
  return async function compose (workDir) {
    const files = await fs.readdir(workDir);
    const configFile = FILES.find(f => files.includes(f));
    if (!configFile) {
      return;
    }

    return {
      stages: {
        main: {
          type: 'compose',
          detach: true,
          files: [configFile],
        },
      },
    };
  };
};
