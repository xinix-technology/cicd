const { spawn } = require('child_process');
const split = require('split2');
const strip = require('strip-color');
const debug = require('debug')('cicd:lib:spawn');

module.exports = function libSpawn (command, args = [], { cwd, env, logger } = {}) {
  return new Promise((resolve, reject) => {
    env = {
      PATH: process.env.PATH,
      ...env,
    };

    debug('Spawning [%s %s] ...', command, args.map(s => `"${s}"`).join(' '));

    const proc = spawn(command, args, { cwd, env });

    const errChunks = [];
    const outChunks = [];

    proc.stdout.pipe(split()).on('data', chunk => {
      if (!logger) {
        return outChunks.push(chunk);
      }

      debug('[out]', chunk);
      logger({ level: 'info', message: strip(chunk) });
    });

    proc.stderr.pipe(split()).on('data', chunk => {
      if (!logger) {
        return errChunks.push(chunk);
      }

      debug('[err]', chunk);
      logger({ level: 'warn', message: strip(chunk) });
    });

    proc.on('close', (code, signal) => {
      const result = {
        code,
        signal,
        stdout: logger ? undefined : outChunks.join('\n'),
        stderr: logger ? undefined : errChunks.join('\n'),
      };

      if (code) {
        const err = new Error(`Spawn process error code: ${code} with args ${JSON.stringify(args)}`);
        Object.assign(err, result);
        return reject(err);
      }

      resolve(result);
    });
  });
};
