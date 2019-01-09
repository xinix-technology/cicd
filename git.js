const BIN = 'git';
const debug = require('debug')('cicd:git');
const { spawn } = require('child_process');
const fs = require('fs');
const fser = require('fser');
const path = require('path');

class Git {
  constructor ({ workDir, remoteUrl }) {
    this.remoteUrl = remoteUrl;
    this.workDir = workDir;
  }

  async init () {
    await fser.mkdirp(fs, this.workDir);
    return this.exec([ 'init' ]);
  }

  async commit (message) {
    await fser.mkdirp(fs, this.workDir);
    await this.exec([ 'add', '.' ]);
    return this.exec([ 'commit', '-am', message ]);
  }

  async pull () {
    await fser.mkdirp(fs, this.workDir);
    return this.exec([ 'pull' ]);
  }

  async clone () {
    if (!this.remoteUrl) {
      throw new Error('Cannot clone unknown remote url');
    }

    await fser.mkdirp(fs, this.workDir);
    return this.exec([ 'clone', this.remoteUrl, '.' ]);
  }

  async checkout (branch = 'master') {
    await fser.mkdirp(fs, this.workDir);
    return this.exec([ 'checkout', branch ]);
  }

  async getCommit () {
    await fser.mkdirp(fs, this.workDir);
    let { out } = await this.exec([ 'rev-parse', 'HEAD' ]);
    return out.toString().trim();
  }

  async sync (branch) {
    let exists = await fser.exists(fs, path.join(this.workDir, '.git'));
    if (exists) {
      await this.checkout(branch);
      await this.pull();
    } else {
      await this.clone();
      await this.checkout(branch);
    }

    return this.getCommit();
  }

  exec (args) {
    return new Promise((resolve, reject) => {
      // debug('exec|', BIN, args);
      let proc = spawn(BIN, args, { cwd: this.workDir });

      let oChunks = [];
      let eChunks = [];

      proc.stdout.on('data', chunk => {
        debug('out|', chunk.toString().trim());
        oChunks.push(chunk);
      });

      proc.stderr.on('data', chunk => {
        debug('err|', chunk.toString().trim());
        eChunks.push(chunk);
      });

      proc.on('close', (code, signal) => {
        if (code) {
          let err = new Error('Git clone caught error');
          err.code = code;
          err.signal = signal;
          err.out = Buffer.concat(oChunks);
          err.err = Buffer.concat(eChunks);

          return reject(err);
        }

        resolve({
          out: Buffer.concat(oChunks),
          err: Buffer.concat(eChunks),
        });
      });
    });
  }
}

module.exports = { Git };
