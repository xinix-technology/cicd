const { Compose } = require('../compose');
const path = require('path');
const assert = require('assert');
const fser = require('fser');
const fs = require('fs');

describe.skip('Lib: Compose', () => {
  let workDir = path.join(process.cwd(), 'working-test');

  before(async () => {
    await fser.mkdirp(fs, workDir);

    await fser.writeFile(fs, path.join(workDir, 'cicd.yml'), `
version: "1"
stages:
  first:
    files:
      - docker-compose.first.yml
  detach:
    detach: true
    files:
      - docker-compose.detach.yml
    `);

    await fser.writeFile(fs, path.join(workDir, 'docker-compose.first.yml'), `
version: "3"
services:
  one:
    image: alpine
    environment:
      - SECRET
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
      let compose = new Compose({ workDir, files: ['docker-compose.first.yml'] });

      try {
        let config = await compose.getConfig();
        assert.strictEqual(config.version, '3.0');
        assert(config.services);
      } finally {
        compose.removeAllListeners('log');
      }
    });
  });

  describe('#pull()', () => {
    it('pull image', async () => {
      let compose = new Compose({ workDir, files: ['docker-compose.first.yml'] });

      try {
        let pulled = false;

        compose.addListener('log', log => {
          if (log.message.match(/^Pulling\s.+\sdone$/)) {
            pulled = true;
          }
        });

        await compose.pull();

        assert(pulled);
      } finally {
        compose.removeAllListeners('log');
      }
    }).timeout(10000);
  });

  describe('#build()', () => {
    it('skip if uses an image', async () => {
      let compose = new Compose({ workDir, files: ['docker-compose.first.yml'] });

      try {
        let imageSkipped = false;

        compose.addListener('log', log => {
          if (log.message.match(/uses an image, skipping$/)) {
            imageSkipped = true;
          }
        });

        await compose.build();

        assert(imageSkipped);
      } finally {
        compose.removeAllListeners('log');
      }
    });
  });

  describe('#up()', () => {
    it('up image', async () => {
      let compose = new Compose({ workDir, files: ['docker-compose.first.yml'] });

      try {
        let ran = false;

        compose.addListener('log', log => {
          if (log.message.match(/PATH=/)) {
            ran = true;
          }
        });

        await compose.up();

        assert(ran);
      } finally {
        compose.removeAllListeners('log');
        await compose.down();
      }
    }).timeout(10000);

    it('respect environment', async () => {
      let env = {
        SECRET: 'foo',
      };
      let compose = new Compose({ workDir, files: ['docker-compose.first.yml'], env });

      try {
        let hasSecret = false;

        compose.addListener('log', log => {
          if (log.message.match(/SECRET=foo/)) {
            hasSecret = true;
          }
        });

        await compose.up();

        assert(hasSecret);
      } finally {
        compose.removeAllListeners('log');
        await compose.down();
      }
    }).timeout(10000);

    it('detach run', async () => {
      let compose = new Compose({ workDir, files: ['docker-compose.detach.yml'] });

      try {
        await compose.up({ detach: true });

        let procs = await compose.ps();

        assert(procs.length !== 0);
      } finally {
        compose.removeAllListeners('log');
        await compose.down();
      }
    }).timeout(20000);
  });
});
