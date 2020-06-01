const fs = require('fs-extra');

const FILES = [
  'docker-stack.yml',
  'docker-stack.yaml',
];

module.exports = function stackResolverFactory (type = 'stack') {
  return async function stack (workDir) {
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
