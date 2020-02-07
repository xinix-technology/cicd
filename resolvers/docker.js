const fs = require('fs-extra');

const FILES = [
  'Dockerfile',
];

module.exports = function () {
  return async function dockerResolve (workDir) {
    const files = await fs.readdir(workDir);
    const configFile = FILES.find(f => files.includes(f));
    if (!configFile) {
      return;
    }

    return {
      stages: {
        main: {
          type: 'docker',
          detach: true,
          dockerfile: 'Dockerfile',
        },
      },
    };
  };
};