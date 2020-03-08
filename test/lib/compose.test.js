const { Compose } = require('../../lib/compose');
const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');

const COMPOSE_DATA = `
version: '3'
services:
  one:
    image: alpine
    environment:
      - FOO
    command: ["env"]
`.trim();

describe('lib:Compose', () => {
  const workDir = path.resolve(process.cwd(), 'tmp-test');

  beforeEach(async () => {
    Compose.reset({
      pull: false,
    });

    await fs.ensureDir(workDir);
    await fs.writeFile(path.join(workDir, 'docker-compose.yml'), COMPOSE_DATA);
  });

  afterEach(async () => {
    Compose.reset();

    await fs.remove(workDir);
  });

  it('run with mock', async () => {
    Compose.OPTIONS.mock = true;

    const compose = new Compose({ workDir });
    await compose.spawn(['ps', '-a']);
  });

  describe('.OPTIONS', () => {
    it('read options', () => {
      assert.strictEqual(Compose.OPTIONS.mock, false);
      assert.strictEqual(Compose.OPTIONS.bin, 'docker-compose');
    });
  });

  describe('constructor', () => {
    it('set files', () => {
      const compose = new Compose({ workDir });
      assert.deepStrictEqual(compose.files, ['docker-compose.yml']);
    });
  });

  describe('#ps()', () => {
    it('return process list', async () => {
      const compose = new Compose({ workDir });
      const result = await compose.ps();
      assert(Array.isArray(result));
    }).timeout(20000);
  });

  describe('#pull()', () => {
    it('pull', async () => {
      const compose = new Compose({ workDir });
      await compose.pull();
    }).timeout(20000);
  });

  describe('#build()', () => {
    it('build', async () => {
      const compose = new Compose({ workDir });
      await compose.build();
    });
  });

  describe('#up()', () => {
    it('up', async () => {
      let ran = false;
      const env = {
        FOO: 'bar',
      };
      function logger ({ message }) {
        if (message.match(/FOO=bar/)) {
          ran = true;
        }
      }
      const compose = new Compose({ workDir, logger, env });
      try {
        await compose.up();
      } finally {
        await compose.down();
      }
      assert.strictEqual(ran, true);
    }).timeout(20000);
  });

  describe('#down()', () => {
    it('down', async () => {
      let ran = false;
      const env = {
        FOO: 'bar',
      };
      function logger ({ message }) {
        if (message.match(/Removing/)) {
          ran = true;
        }
      }
      const compose = new Compose({ workDir, env });
      await compose.up();

      compose.logger = logger;
      await compose.down();
      assert.strictEqual(ran, true);
    }).timeout(20000);
  });
});
