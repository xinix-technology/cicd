const fs = require('fs-extra');

const FILES = [
  'docker-compose.yml',
  'docker-compose.yaml',
];

module.exports = function composeResolverFactory (type = 'compose') {
  return async function compose (workDir) {
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
          files: [configFile],
        },
      },
    };
  };
};
