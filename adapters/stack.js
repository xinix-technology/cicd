const debug = require('debug')('cicd:adapters:stack');
const debugLog = require('debug')('cicd:adapters:stack:log');
const { spawn } = require('child_process');

const OPTIONS = {
  bin: 'docker',
};

class StackAdapter {
  static get OPTIONS () {
    return OPTIONS;
  }

  static test ({ file }) {
    return !!file;
  }

  static validate ({ file = 'docker-compose.yml' }) {
    return { detach: true, file };
  }

  constructor (stage) {
    this.stage = stage;
  }

  async run ({ env, logger = () => undefined } = {}) {
    const { file } = this.stage;
    const name = `${this.stage.pipeline.name}`;
    // const name = `${this.stage.pipeline.name}__${this.stage.name}`;

    logger({ level: 'head', message: 'Deploying ...' });
    await this.spawn(['deploy', '-c', file, name], { logger });
  }

  async abort ({ env, logger = () => undefined } = {}) {
    // const name = `${this.stage.pipeline.name}__${this.stage.name}`;
    const name = `${this.stage.pipeline.name}`;

    logger({ level: 'head', message: 'Removing ...' });
    await this.spawn(['rm', name], { logger });
  }

  spawn (params, { io, logger } = {}) {
    return new Promise((resolve, reject) => {
      const env = {
        PATH: process.env.PATH,
        ...this.env,
      };
      const opts = { cwd: this.workDir, env };

      debug('Docker stack: %o', params);

      const proc = spawn(OPTIONS.bin, ['stack', ...params], opts);
      proc.stdout.on('data', chunk => {
        if (io && io[1]) {
          return io[1](chunk);
        }

        chunk.toString()
          .replace(/\r\n/, '\n').split('\n')
          .map(line => line.trim())
          .slice(0, -1)
          .forEach(message => {
            debugLog('out|', message);
            logger({ level: 'info', message });
          });
      });

      proc.stderr.on('data', chunk => {
        if (io && io[2]) {
          return io[2](chunk);
        }

        chunk.toString()
          .replace(/\r\n/, '\n').split('\n')
          .map(line => line.trim())
          .slice(0, -1)
          .forEach(message => {
            debugLog('err|', message);
            logger({ level: 'warn', message });
          });
      });

      proc.on('error', err => {
        debug('Spawn caught err', err);
      });

      proc.on('close', (code, signal) => {
        if (code) {
          const err = new Error(`Child process spawn error code: ${code} for parameters ${JSON.stringify(params)}`);
          err.code = code;
          err.signal = signal;
          return reject(err);
        }

        resolve();
      });
    });
  }
}

module.exports = StackAdapter;
