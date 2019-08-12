const { Stage, Registry } = require('..');
const assert = require('assert');
// const debug = require('debug')('cicd:test:stage');

describe('Stage', () => {
  beforeEach(() => {
    Registry.resetInstance();
  });

  afterEach(() => {
    Registry.resetInstance();
  });

  describe('#workDir', () => {
    it('return pipeline workDir', () => {
      const stage = new Stage({
        pipeline: {
          workDir: 'foo',
        },
      });

      assert.strictEqual(stage.workDir, 'foo');
    });
  });

  describe('#canonicalName', () => {
    it('return canonical name', () => {
      const stage = new Stage({
        name: 'bar',
        pipeline: {
          name: 'foo',
        },
      });

      assert.strictEqual(stage.canonicalName, 'foo:bar');
    });
  });

  describe('#run()', () => {
    it('create runner and run', async () => {
      let ran = false;
      Registry.setInstance({
        createRunner () {
          return {
            run () {
              ran = true;
            },
          };
        },
      });

      const stage = new Stage({ name: 'bar' });
      await stage.run({
        env: {
          FOO: 'bar',
        },
      });

      assert(ran);
    });
  });
});
