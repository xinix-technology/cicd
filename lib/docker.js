const debug = require('debug')('cicd:lib:docker');
const debugLog = require('debug')('cicd:lib:docker:log');
const { spawn } = require('child_process');
const exec = require('util').promisify(require('child_process').exec);
const path = require('path');
const strip = require('strip-color');

const CONTAINER_SUFFIX = '.0';
let OPTIONS = {};
let LOGS = [];

class Docker {
  static reset (options) {
    OPTIONS = {
      mock: false,
      bin: 'docker',
      pull: false,
      ...options,
    };

    LOGS = [];
  }

  static get OPTIONS () {
    return OPTIONS;
  }

  static get LOGS () {
    return LOGS;
  }

  static async version () {
    const { stdout } = await exec(`${OPTIONS.bin} -v`);
    return stdout.split('version')[1].trim();
  }

  constructor ({ workDir, file = 'Dockerfile', name, env = {}, logger = () => undefined }) {
    this.workDir = workDir;
    this.file = file;
    this.env = env;
    this.name = name || `${path.basename(workDir)}_main`;
    this.logger = logger;
  }

  async build () {
    let params = ['build', '-f', this.file, '-t', this.name, '--pull', '--force-rm'];

    for (const key in this.env) {
      params.push('--build-arg', `${key}="${this.env[key]}"`);
    }

    params.push('.');

    try {
      if (!OPTIONS.pull) {
        throw new Error('Immediate to build without pull');
      }

      this.logger({ level: 'info', message: 'Try building with pull newer image...' });
      await this.spawn(params);
    } catch (err) {
      this.logger({ level: 'info', message: 'Try building without pull newer image...' });
      params = params.filter(param => param !== '--pull');
      await this.spawn(params);
    }
  }

  run () {
    const params = ['run', '--rm', '--name', `${this.name}${CONTAINER_SUFFIX}`];

    for (const key in this.env) {
      params.push('-e', `${key}=${this.env[key]}`);
    }

    params.push(this.name);

    return this.spawn(params);
  }

  create () {
    const params = ['create', '--name', `${this.name}${CONTAINER_SUFFIX}`];

    for (const key in this.env) {
      params.push('-e', `${key}=${this.env[key]}`);
    }

    params.push(this.name);

    return this.spawn(params);
  }

  start () {
    const params = ['start', `${this.name}${CONTAINER_SUFFIX}`];

    return this.spawn(params);
  }

  async rm () {
    const containerName = `${this.name}${CONTAINER_SUFFIX}`;
    try {
      await this.spawn(['rm', '-f', containerName]);
    } catch (err) {
      // noop
    }
  }

  async rmi () {
    try {
      await this.spawn(['image', 'rm', '-f', this.name]);
    } catch (err) {
      // noop
    }
  }

  spawn (params, { io, logger = this.logger } = {}) {
    return new Promise((resolve, reject) => {
      const env = {
        PATH: process.env.PATH,
        ...this.env,
      };
      const opts = { cwd: this.workDir, env };

      if (OPTIONS.mock) {
        debug('Docker mock: %s %o', OPTIONS.bin, params);
        LOGS.push(params);
        return resolve();
      }

      debug('Docker spawn: %s %o', OPTIONS.bin, params);

      const proc = spawn(OPTIONS.bin, params, opts);
      proc.stdout.on('data', chunk => {
        if (io && io[1]) {
          return io[1](chunk);
        }

        chunk.toString()
          .replace(/\r\n/, '\n').split('\n')
          .map(line => line.trim())
          .slice(0, -1)
          .forEach(message => {
            message = strip(message);
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
            message = strip(message);
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

Docker.reset();

module.exports = { Docker };
