const { Logger } = require('./logger');
const { spawn } = require('child_process');
const yaml = require('js-yaml');
const debug = require('debug')('cicd:compose');
const debugLog = require('debug')('cicd:compose:log');

class Compose {
  constructor ({ bin = 'docker-compose', workDir, files = [], env = {}, logger = Logger.getInstance() }) {
    this.bin = bin;
    this.workDir = workDir;
    this.files = files;
    this.env = env;
    this.logger = logger;
  }

  async ps () {
    let procs = [];
    function stdout (chunk) {
      procs = chunk.toString()
        .replace(/\r\n/, '\n').split('\n')
        .slice(2, -1)
        .map(line => {
          const matches = line.match(/^([^\s]+)\s+(.+)(Up|Exit ([-\d]+))\s+(.+)$/);
          return {
            name: matches[1].trim(),
            command: matches[2].trim(),
            state: matches[3].trim(),
            code: Number((matches[4] || '').trim()),
            ports: matches[5].trim(),
          };
        });
    }

    await this.spawnDockerCompose(['ps'], { io: [null, stdout, null] });

    return procs;
  }

  async getConfig () {
    const chunks = [];
    function stdout (chunk) {
      chunks.push(chunk);
    }

    await this.spawnDockerCompose(['config'], { io: [null, stdout, null] });

    await new Promise(resolve => setTimeout(resolve));

    const content = Buffer.concat(chunks).toString();
    return yaml.safeLoad(content);
  }

  pull () {
    return this.spawnDockerCompose(['pull']);
  }

  build () {
    return this.spawnDockerCompose(['build', '--parallel']);
  }

  up ({ detach = false } = {}) {
    const args = ['up', '--no-color'];

    if (detach) {
      args.push('-d');
    } else {
      args.push('--abort-on-container-exit');
    }

    return this.spawnDockerCompose(args);
  }

  down () {
    // return this.spawnDockerCompose(['down']);
    return this.spawnDockerCompose(['down', '--rmi', 'local']);
  }

  generateArgs (params) {
    const args = ['--no-ansi'];

    this.files.forEach(file => {
      args.push('-f', file);
    });

    args.push(...params);

    return args;
  }

  spawnDockerCompose (params, { io } = {}) {
    return new Promise((resolve, reject) => {
      const args = this.generateArgs(params);

      const env = {
        PATH: process.env.PATH,
        ...this.env,
      };
      const opts = { cwd: this.workDir, env };

      debug('Compose spawn: %s %o', this.bin, args);

      const proc = spawn(this.bin, args, opts);
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
            this.logger.log({ topic: 'info', message });
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
            this.logger.log({ topic: 'warn', message });
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

module.exports = { Compose };
