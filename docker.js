const { EventEmitter } = require('events');
const debug = require('debug')('cicd:docker');
const { spawn } = require('child_process');

class Docker extends EventEmitter {
  constructor ({ bin = 'docker', workDir, file, name, env = {} }) {
    super();

    this.bin = bin;
    this.workDir = workDir;
    this.file = file;
    this.env = env;
    this.name = name;
  }

  build () {
    return this.spawnDocker([ 'build', '-f', this.file, '-t', this.name, '.' ]);
  }

  run () {
    return this.spawnDocker([ 'run', '--rm', '--name', `${this.name}_1`, this.name ]);
  }

  async rm () {
    let containerName = `${this.name}_1`;
    try {
      await this.spawnDocker([ 'rm', '-f', containerName ]);
    } catch (err) {
      // noop
    }
  }

  async rmi () {
    try {
      await this.spawnDocker([ 'image', 'rm', '-f', this.name ]);
    } catch (err) {
      // noop
    }
  }

  spawnDocker (params, { io } = {}) {
    return new Promise((resolve, reject) => {
      let env = {
        PATH: process.env.PATH,
        ...this.env,
      };
      let opts = { cwd: this.workDir, env };

      debug('Docker spawn: %s %o', this.bin, params);

      let proc = spawn(this.bin, params, opts);
      proc.stdout.on('data', chunk => {
        if (io && io[1]) {
          return io[1](chunk);
        }

        chunk.toString()
          .replace(/\r\n/, '\n').split('\n')
          .map(line => line.trim())
          .slice(0, -1)
          .forEach(message => {
            debug('out|', message);
            this.emit('log', { topic: 'info', message });
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
            debug('err|', message);
            this.emit('log', { topic: 'warn', message });
          });
      });

      proc.on('error', err => {
        debug('Spawn caught err', err);
      });

      proc.on('close', (code, signal) => {
        if (code) {
          let err = new Error(`Child process spawn error code: ${code} for parameters ${JSON.stringify(params)}`);
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
