const { Adapter } = require('../adapter');
const spawn = require('../lib/spawn');
const fs = require('fs-extra');
const path = require('path');

const CONTAINER_SUFFIX = '.0';

const OPTS = {
  bin: 'docker',
};

class DockerAdapter extends Adapter {
  static test ({ dockerfile }) {
    return !!dockerfile;
  }

  static validate ({ detach = false, dockerfile = 'Dockerfile' }) {
    return { detach, dockerfile };
  }

  async run ({ env = {}, labels = {}, networks = [], logger = () => undefined } = {}) {
    const { workDir, detach, dockerfile } = this.stage;

    const name = this.cannonicalName;

    try {
      logger({ level: 'head', message: 'Building image ...' });

      await dockerBuild({ workDir, env, dockerfile, name, logger });

      try {
        logger({ level: 'head', message: 'Removing running container if exists ...' });
        await dockerRm({ workDir, logger, name });
      } catch (err) {
        // noop
      }

      if (detach) {
        logger({ level: 'head', message: 'Running ...' });
        await dockerCreate({ workDir, name, logger, networks, labels, env });
        await dockerStart({ workDir, logger, name });
      } else {
        logger({ level: 'head', message: 'Running ...' });
        await dockerRun({ env, labels, name, workDir, logger, networks });
      }
    } finally {
      if (!detach) {
        try {
          logger({ level: 'head', message: 'Removing container if exists ...' });
          await dockerRm({ workDir, logger, name });
        } catch (err) {
          // noop
        }

        try {
          logger({ level: 'head', message: 'Removing image if exists ...' });
          await dockerRmi({ workDir, logger, name });
        } catch (err) {
          // noop
        }
      }
    }
  }

  async abort ({ env, logger = () => undefined } = {}) {
    const { workDir } = this.stage;

    const name = this.cannonicalName;
    // const docker = new Docker({ workDir, file: dockerfile, env, name, logger });

    try {
      logger({ level: 'head', message: 'Aborting ...' });

      try {
        logger({ level: 'head', message: 'Removing container if exists ...' });
        await dockerRm({ workDir, logger, name });
      } catch (err) {
        // noop
      }

      try {
        logger({ level: 'head', message: 'Removing image if exists ...' });
        await dockerRmi({ workDir, logger, name });
      } catch (err) {
        // noop
      }
    } catch (err) {
      logger({ level: 'error', message: `Abort failed caused by: ${err}` });
    }
  }
}

module.exports = DockerAdapter;
module.exports.OPTS = OPTS;

async function dockerBuild ({ workDir, dockerfile, name, env, logger }) {
  const params = ['build', '--file', dockerfile, '--tag', name, '--force-rm'];

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

function dockerRm ({ workDir, logger, name }) {
  const params = ['rm', '-f', `${name}${CONTAINER_SUFFIX}`];
  return spawn(OPTS.bin, params, { cwd: workDir, logger });
}

function dockerRmi ({ workDir, logger, name }) {
  const params = ['image', 'rm', '-f', name];
  return spawn(OPTS.bin, params, { cwd: workDir, logger });
}

function dockerRun ({ env, labels, name, workDir, logger, networks }) {
  const params = ['run', '--rm', '--name', `${name}${CONTAINER_SUFFIX}`];

  for (const key in env) {
    params.push('-e', `${key}=${env[key]}`);
  }

  for (const key in networks) {
    params.push('--network', `${networks[key]}`);
  }

  for (const key in labels) {
    params.push('--label', `${key}=${labels[key]}`);
  }

  params.push(name);

  return spawn(OPTS.bin, params, { cwd: workDir, logger });
}

function dockerCreate ({ name, workDir, env, labels, logger, networks }) {
  const params = ['create', '--name', `${name}${CONTAINER_SUFFIX}`];

  for (const key in env) {
    params.push('-e', `${key}=${env[key]}`);
  }

  for (const key in networks) {
    params.push('--network', `${networks[key]}`);
  }

  for (const key in labels) {
    params.push('-l', `${key}=${labels[key]}`);
  }

  params.push(name);

  return spawn(OPTS.bin, params, { cwd: workDir, logger });
}

function dockerStart ({ workDir, logger, name }) {
  const params = ['start', `${name}${CONTAINER_SUFFIX}`];

  return spawn(OPTS.bin, params, { cwd: workDir, logger });
}
