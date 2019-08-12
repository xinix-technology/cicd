const { Docker } = require('..');
const path = require('path');
const assert = require('assert');
const fser = require('fser');
const fs = require('fs');
// const debug = require('debug')('cicd:test:docker');

describe.skip('Docker', () => {
  const workDir = path.join(process.cwd(), 'working-test');

  before(async () => {
    await fser.mkdirp(fs, workDir);

    await fser.writeFile(fs, path.join(workDir, 'Dockerfile'), `
FROM alpine
CMD [ "env" ]
    `);
  });

  after(async () => {
    await fser.rmrf(fs, workDir);
  });

  describe('#build()', () => {
    it('build image', async () => {
      const logger = {
        log ({ message }) {
          if (message.match(/Successfully tagged/)) {
            this.built = true;
          }
        },
      };
      const env = { FOO: 'bar' };
      const docker = new Docker({ workDir, file: 'Dockerfile', logger, env });
      await docker.build();
      assert(logger.built);
    }).timeout(10000);
  });

  describe('#build()', () => {
    it('build image, run, rm, rmi', async () => {
      const logger = {
        log ({ message }) {
          if (message.match(/Successfully tagged/)) {
            this.built = true;
          } else if (message.match(/FOO="bar"/)) {
            this.ran = true;
          }
        },
      };
      const env = { FOO: 'bar' };
      const docker = new Docker({ workDir, file: 'Dockerfile', logger, env });
      try {
        await docker.build();
        await docker.run();
        await docker.rm();
        await docker.rmi();
      } finally {
        try {
          await docker.rm();
        } catch (err) {
          // noop
        }
        try {
          await docker.rmi();
        } catch (err) {
          // noop
        }
      }
      assert.strictEqual(logger.built, true);
      assert.strictEqual(logger.ran, true);
    }).timeout(10000);
  });
});
