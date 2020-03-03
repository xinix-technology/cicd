const fs = require('fs-extra');

const FILES = [
  'Dockerfile',
];

module.exports = function (type = 'docker') {
  return async function docker (workDir) {
    const files = await fs.readdir(workDir);
    const configFile = FILES.find(f => files.includes(f));
    if (!configFile) {
      return;
    }

    return {
      stages: {
        main: {
          type,
          detach: true,
          dockerfile: 'Dockerfile',
        },
      },
    };
  };
};
