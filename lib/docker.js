const debug = require('debug')('cicd:lib:docker');
const spawn = require('./spawn');
const path = require('path');
const fs = require('fs-extra');

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
    const { stdout } = await spawn(['-v']);
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

    if (this.workDir) {
      const content = await fs.readFile(path.join(this.workDir, this.file), 'utf8');
      const args = content.match(/ARG\s+\w+/g) || [];
      const usedArgs = (args.map(token => token.split(/\s+/).pop()));
      for (const key in this.env) {
        if (usedArgs.includes(key)) {
          params.push('--build-arg', `${key}=${this.env[key]}`);
        }
      }
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

  run ({ labels = {} } = {}) {
    const params = ['run', '--rm', '--name', `${this.name}${CONTAINER_SUFFIX}`];

    for (const key in this.env) {
      params.push('-e', `${key}=${this.env[key]}`);
    }

    for (const key in labels) {
      params.push('--label', `${key}=${labels[key]}`);
    }

    params.push(this.name);

    return this.spawn(params);
  }

  create ({ labels = {} } = {}) {
    const params = ['create', '--name', `${this.name}${CONTAINER_SUFFIX}`];

    for (const key in this.env) {
      params.push('-e', `${key}=${this.env[key]}`);
    }

    for (const key in labels) {
      params.push('--label', `${key}=${labels[key]}`);
    }

    params.push(this.name);

    return this.spawn(params);
  }

  async start () {
    const params = ['start', `${this.name}${CONTAINER_SUFFIX}`];

    await this.spawn(params);
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

  spawn (params, { logger = this.logger, returns = false } = {}) {
    const env = {
      PATH: process.env.PATH,
      ...this.env,
    };

    const opts = { cwd: this.workDir, env };
    if (!returns) {
      opts.logger = logger;
    }

    if (OPTIONS.mock) {
      debug('Docker mock: %s %o', OPTIONS.bin, params);
      LOGS.push(params);
      return { code: 0 };
    }

    debug('Docker spawn: %s %o', OPTIONS.bin, params);

    return spawn(OPTIONS.bin, params, opts);
  }
}

Docker.reset();

module.exports = { Docker };
