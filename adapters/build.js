const { Adapter } = require('../adapter');
const spawn = require('../lib/spawn');
const fs = require('fs-extra');
const path = require('path');

const OPTS = {
  bin: 'docker',
};

class BuildAdapter extends Adapter {
  static test ({ dockerfile }) {
    return !!dockerfile;
  }

  static validate ({ dockerfile = 'Dockerfile', tag }) {
    if (!tag) {
      throw new Error('Unknown tag');
    }
    return { detach: false, dockerfile, tag };
  }

  async run ({ env = {}, logger = () => undefined } = {}) {
    const { tag } = this.stage;

    logger({ level: 'head', message: `Building image (${tag}) ...` });
    await this.dockerBuild({ env, logger });
  }

  async abort ({ env, logger = () => undefined } = {}) {
    const { tag } = this.stage;
    logger({ level: 'head', message: `Removing image (${tag}) ...` });
    await this.dockerRmi({ env, logger });
  }

  async dockerBuild ({ env, logger }) {
    const { workDir, dockerfile, tag } = this.stage;

    const params = ['build', '--file', dockerfile, '--tag', tag, '--force-rm'];

    if (workDir) {
      const content = await fs.readFile(path.join(workDir, dockerfile), 'utf8');
      const args = content.match(/ARG\s+\w+/g) || [];
      const usedArgs = (args.map(token => token.split(/\s+/).pop()));
      for (const key in env) {
        if (usedArgs.includes(key)) {
          params.push('--build-arg', `${key}=${env[key]}`);
        }
      }
    }

    params.push('.');

    return spawn(OPTS.bin, params, { cwd: workDir, logger });
  }

  dockerRmi ({ logger }) {
    const { workDir, tag } = this.stage;
    const params = ['image', 'rm', '-f', tag];
    return spawn(OPTS.bin, params, { cwd: workDir, logger });
  }
}

module.exports = BuildAdapter;
module.exports.OPTS = OPTS;
