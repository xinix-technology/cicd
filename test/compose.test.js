const { Compose } = require('..');
const path = require('path');
const assert = require('assert');
const fser = require('fser');
const fs = require('fs');
const debug = require('debug')('cicd:test:compose');

describe.skip('Compose', () => {
  const workDir = path.join(process.cwd(), 'working-test');

  before(async () => {
    await fser.mkdirp(fs, workDir);

    await fser.writeFile(fs, path.join(workDir, 'docker-compose.first.yml'), `
version: "3"
services:
  one:
    image: alpine
    environment:
      - FOO
    command: [ "env" ]
    `);

    await fser.writeFile(fs, path.join(workDir, 'docker-compose.detach.yml'), `
version: "3"
services:
  detach:
    image: alpine
    command: [ "ping", "goo.gl" ]
    `);
  });

  after(async () => {
    await fser.rmrf(fs, workDir);
  });

  describe('#getConfig()', () => {
    it('get config', async () => {
      const compose = new Compose({ workDir, files: ['docker-compose.first.yml'] });

      const config = await compose.getConfig();
      assert.strictEqual(config.version, '3.0');
      assert(config.services);
    });
  });

  describe('#pull()', () => {
    it('pull image', async () => {
      const logger = {
        log ({ message }) {
          if (message.match(/^Pulling\s.+\sdone$/)) {
            this.pulled = true;
          }
        },
      };

      const compose = new Compose({ workDir, files: ['docker-compose.first.yml'], logger });
      await compose.pull();
      assert(logger.pulled);
    }).timeout(10000);
  });

  describe('#build()', () => {
    it('skip if uses an image', async () => {
      const logger = {
        log ({ message }) {
          if (message.match(/uses an image, skipping$/)) {
            this.imageSkipped = true;
          }
        },
      };

      const compose = new Compose({ workDir, files: ['docker-compose.first.yml'], logger });

      await compose.build();
      assert(logger.imageSkipped);
    });
  });

  describe('#up()', () => {
    it('up image', async () => {
      const env = {
        FOO: 'bar',
      };
      const logger = {
        log ({ message }) {
          if (message.match(/FOO=bar/)) {
            this.found = true;
          }
        },
      };

      const compose = new Compose({ workDir, files: ['docker-compose.first.yml'], env, logger });

      try {
        await compose.up();
      } finally {
        await compose.down();
      }
      assert(logger.found);
    }).timeout(10000);

    it('detach run', async () => {
      const logger = {
        log ({ message }) {
          if (message.match(/FOO=bar/)) {
            this.found = true;
          }
        },
      };

      const compose = new Compose({ workDir, files: ['docker-compose.detach.yml'], logger });

      try {
        await compose.up({ detach: true });
        const procs = await compose.ps();
        assert(procs.length !== 0);
      } finally {
        try {
          await compose.down();
        } catch (err) {
          debug(err);
        }
      }
    }).timeout(20000);
  });
});
