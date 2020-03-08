const { Docker } = require('../../lib/docker');
const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');

const DOCKERFILE_DATA = `
FROM alpine
CMD [ "env" ]
`.trim();

describe('lib:Docker', () => {
  const workDir = path.resolve(process.cwd(), 'tmp-test');

  beforeEach(async () => {
    Docker.reset({
      pull: false,
    });

    await fs.ensureDir(workDir);
    await fs.writeFile(path.join(workDir, 'Dockerfile'), DOCKERFILE_DATA);
  });

  afterEach(async () => {
    Docker.reset();

    await fs.remove(workDir);
  });

  it('run with mock', async () => {
    Docker.OPTIONS.mock = true;

    const docker = new Docker({ workDir });
    await docker.spawn(['ps', '-a']);
  });

  describe('.OPTIONS', () => {
    it('read options', () => {
      assert.strictEqual(Docker.OPTIONS.mock, false);
      assert.strictEqual(Docker.OPTIONS.bin, 'docker');
    });
  });

  describe('constructor', () => {
    it('set default name and file', () => {
      const docker = new Docker({ workDir });
      assert.strictEqual(docker.name, 'tmp-test_main');
      assert.strictEqual(docker.file, 'Dockerfile');
    });
  });

  describe('#build()', () => {
    it('build dockerfile to image', async () => {
      let built = false;
      function logger ({ message }) {
        if (message.match(/Successfully built/)) {
          built = true;
        }
      }
      const docker = new Docker({ workDir, logger });
      await docker.build();
      assert.strictEqual(built, true);
    }).timeout(20000);
  });

  describe('#run()', () => {
    it('run container based from image', async () => {
      let ran = false;
      const env = {
        FOO: 'bar',
      };
      function logger ({ message }) {
        if (message.match(/FOO=bar/)) {
          ran = true;
        }
      }
      const docker = new Docker({ workDir, logger, env });
      await docker.build();
      await docker.run();
      assert.strictEqual(ran, true);
    }).timeout(20000);
  });

  describe('#rm()', () => {
    it('remove container', async () => {
      const docker = new Docker({ workDir });
      try {
        await docker.spawn(['rm', '-f', `${docker.name}.0`]);
      } catch (err) {
        // noop
      }

      await docker.spawn(['run', '--name', `${docker.name}.0`, '-d', 'alpine', 'ping', 'goo.gl']);

      let found = false;
      function logger ({ message }) {
        if (message.includes(`${docker.name}.0`)) {
          found = true;
        }
      }
      await docker.rm();
      await docker.spawn(['ps', '-a'], { logger });
      assert(!found);
    }).timeout(20000);
  });

  describe('#rmi()', () => {
    it('remove image', async () => {
      const docker = new Docker({ workDir });
      await docker.spawn(['build', '-f', docker.file, '-t', docker.name, '--force-rm', '.']);

      let found = false;
      function logger ({ message }) {
        if (message.includes(docker.name)) {
          found = true;
        }
      }
      await docker.rmi();
      await docker.spawn(['image', 'ls'], { logger });
      assert(!found);
    }).timeout(20000);
  });
});
