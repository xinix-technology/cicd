const spawn = require('./spawn');
const yaml = require('js-yaml');
const debug = require('debug')('cicd:lib:compose');
const fs = require('fs-extra');
const path = require('path');

let OPTIONS = {};
let LOGS = [];

class Compose {
  static reset (options) {
    OPTIONS = {
      mock: false,
      bin: 'docker-compose',
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
    const { stdout } = await spawn(OPTIONS.bin, ['-v']);
    return stdout.split('version')[1].trim();
  }

  constructor ({ workDir, files = ['docker-compose.yml'], env = {}, logger = () => undefined }) {
    this.workDir = workDir;
    this.files = files;
    this.origFiles = files;
    this.env = env;
    this.logger = logger;
  }

  async ps () {
    const { stdout } = await this.spawn(['ps'], { returns: true });

    return stdout.replace(/\r\n/, '\n').split('\n')
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

  async pull () {
    await this.spawn(['pull']);
  }

  async build () {
    await this.spawn(['build', '--parallel']);
  }

  async mergeFiles ({ labels = {} } = {}) {
    if (OPTIONS.mock) {
      debug('Compose mock merge files');
      return;
    }

    debug('Compose merge files');
    const { stdout } = await this.spawn(['config'], { returns: true });
    const config = yaml.load(stdout);
    for (const name in config.services) {
      const service = config.services[name];

      const serviceLabels = service.labels = service.labels || {};
      if (Array.isArray(serviceLabels)) {
        for (const k in labels) { // eslint-disable-line max-depth
          serviceLabels.push(`${k}=${labels[k]}`);
        }
      } else {
        Object.assign(serviceLabels, labels);
      }
    }

    await fs.writeFile(path.join(this.workDir, '.compose.yml'), yaml.dump(config));
  }

  async up ({ detach = false, labels = {} } = {}) {
    try {
      await this.mergeFiles({ labels });

      this.files = ['.compose.yml'];
      const args = ['up', '--no-color'];

      if (detach) {
        args.push('-d');
      } else {
        args.push('--abort-on-container-exit');
      }
      return this.spawn(args);
    } finally {
      this.files = this.origFiles;
    }
  }

  down () {
    // return this.spawn(['down']);
    return this.spawn(['down', '--rmi', 'local']);
  }

  generateArgs (params) {
    const args = ['--no-ansi'];

    this.files.forEach(file => {
      args.push('-f', file);
    });

    args.push(...params);

    return args;
  }

  spawn (params, { returns = false } = {}) {
    const args = this.generateArgs(params);

    const env = {
      PATH: process.env.PATH,
      ...this.env,
    };

    const opts = { cwd: this.workDir, env };
    if (!returns) {
      opts.logger = this.logger;
    }

    if (OPTIONS.mock) {
      debug('Compose mock: %s %o', OPTIONS.bin, args);
      LOGS.push(args);
      return { code: 0 };
    }

    debug('Compose spawn: %s %o', OPTIONS.bin, args);

    return spawn(OPTIONS.bin, args, opts);
  }
}

Compose.reset();

module.exports = { Compose };
