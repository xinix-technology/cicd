const { Logger } = require('./logger');
const debug = require('debug')('cicd:docker');
const debugLog = require('debug')('cicd:docker:log');
const { spawn } = require('child_process');
const path = require('path');

class Docker {
  constructor ({ bin = 'docker', workDir, file, name, env = {}, logger = Logger.getInstance() }) {
    this.bin = bin;
    this.workDir = workDir;
    this.file = file;
    this.env = env;
    this.name = name || `${path.basename(workDir)}.docker.cicd`;
    this.logger = logger;
  }

  async build () {
    let params = ['build', '-f', this.file, '-t', this.name, '--pull', '--force-rm'];

    for (const key in this.env) {
      params.push('--build-arg', `${key}="${this.env[key]}"`);
    }

    params.push('.');

    try {
      this.logger.log({ topic: 'info', message: 'Try building with pull newer image...' });
      await this.spawnDocker(params);
    } catch (err) {
      this.logger.log({ topic: 'info', message: 'Try building without pull newer image...' });
      params = params.filter(param => param !== '--pull');
      await this.spawnDocker(params);
    }
  }

  run () {
    const params = ['run', '--rm', '--name', `${this.name}.1`];

    for (const key in this.env) {
      params.push('-e', `${key}="${this.env[key]}"`);
    }

    params.push(this.name);

    return this.spawnDocker(params);
  }

  async rm () {
    const containerName = `${this.name}.1`;
    try {
      await this.spawnDocker(['rm', '-f', containerName]);
    } catch (err) {
      // noop
    }
  }

  async rmi () {
    try {
      await this.spawnDocker(['image', 'rm', '-f', this.name]);
    } catch (err) {
      // noop
    }
  }

  spawnDocker (params, { io } = {}) {
    return new Promise((resolve, reject) => {
      const env = {
        PATH: process.env.PATH,
        ...this.env,
      };
      const opts = { cwd: this.workDir, env };

      debug('Docker spawn: %s %o', this.bin, params);

      const proc = spawn(this.bin, params, opts);
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

module.exports = { Docker };
