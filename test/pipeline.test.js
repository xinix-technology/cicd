const { Registry, Pipeline } = require('..');
const path = require('path');
const fs = require('fs');
const assert = require('assert');

const { mkdirp, rmrf } = require('fser');
// const debug = require('debug')('cicd:test:pipeline');

describe('Pipeline', () => {
  const workDir = path.join(process.cwd(), 'working-test');

  beforeEach(async () => {
    Registry.resetInstance();
    await mkdirp(fs, workDir);
  });

  afterEach(async () => {
    Registry.resetInstance();
    await rmrf(fs, workDir);
  });

  describe('constructor', () => {
    it('must define working directory', () => {
      assert.doesNotThrow(() => {
        const pipeline = new Pipeline({ workDir });
        assert.strictEqual(pipeline.name, 'working-test');
      });

      assert.throws(() => {
        const pipeline = new Pipeline();
        assert(pipeline);
      }, /Undefined working directory/);
    });
  });

  describe('#configure()', () => {
    it('configure with object parameter', async () => {
      const pipeline = new Pipeline({ workDir });

      await pipeline.configure({
        version: '1',
        stages: {
          foo: {
            files: ['compose.yml'],
          },
          bar: {
            dockerfile: 'Dockerfile',
          },
        },
      });

      assert.strictEqual(pipeline.stages.length, 2);
    });

    it('configure using configurators', async () => {
      const pipeline = new Pipeline({ workDir });

      const registry = new Registry();
      Registry.setInstance(registry);

      try {
        await pipeline.configure();
        throw new Error('Must caught error');
      } catch (err) {
        if (!err.message.match(/Unable to resolve configuration/)) {
          throw err;
        }
      }

      registry.addConfigurator(function testConfigure () {
        return {
          version: '1',
          stages: {
            foo: {
              files: ['compose.yml'],
            },
            bar: {
              dockerfile: 'Dockerfile',
            },
          },
        };
      });

      await pipeline.configure();
      assert.strictEqual(pipeline.stages.length, 2);
    });
  });

  describe('#getStage()', () => {
    it('throw error if not configured yet', () => {
      const pipeline = new Pipeline({ workDir });
      assert.throws(() => {
        pipeline.getStage();
      }, /Not configured yet/);
    });

    it('return stage by its name', async () => {
      const pipeline = new Pipeline({ workDir });
      await pipeline.configure({
        version: '1',
        stages: {
          foo: {
            foo: 'foo',
          },
          bar: {
            bar: 'bar',
          },
        },
      });

      const foo = pipeline.getStage('foo');
      assert.strictEqual(foo.name, 'foo');
      assert.strictEqual(foo.options.foo, 'foo');

      const bar = pipeline.getStage('bar');
      assert.strictEqual(bar.name, 'bar');
      assert.strictEqual(bar.options.bar, 'bar');

      const baz = pipeline.getStage('baz');
      assert.strictEqual(baz, undefined);
    });
  });
});
