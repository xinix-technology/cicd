const { Pipeline } = require('../pipeline');
const { Stage } = require('../stage');
const path = require('path');
const assert = require('assert');

describe('Pipeline', () => {
  const workDir = path.join(process.cwd(), 'tmp-test');

  beforeEach(() => {
    Pipeline.reset(true);
    Stage.reset(true);
  });

  it('has default resolvers', () => {
    Pipeline.reset();
    Stage.reset();
    assert.strictEqual(Pipeline.RESOLVERS.length, 3);
  });

  describe('.addResolver()', () => {
    it('add new resolver', () => {
      const resolver = () => ({});
      Pipeline.addResolver(resolver);
      assert.strictEqual(Pipeline.RESOLVERS[Pipeline.RESOLVERS.length - 1], resolver);
    });
  });

  describe('.validate()', () => {
    it('validate pipeline configuration', () => {
      assert.throws(() => {
        Pipeline.validate({});
      }, /Version must be specified/);

      assert.throws(() => {
        Pipeline.validate({
          version: '1',
        });
      }, /Name must be specified/);

      assert.throws(() => {
        Pipeline.validate({
          version: '1',
          name: 'foo',
        });
      }, /Stages cannot be empty/);

      assert.throws(() => {
        Pipeline.validate({
          version: '1',
          name: 'foo',
          stages: {},
        });
      }, /Stages cannot be empty/);

      Pipeline.validate({
        version: '1',
        name: 'foo',
        stages: {
          bar: {},
        },
      });
    });
  });

  describe('.resolve()', () => {
    it('resolve using suitable resolver', async () => {
      Stage.putAdapter('foo', class {
        static test () {
          return true;
        }

        static validate (config) {
          return config;
        }
      });

      Pipeline.addResolver(workDir => {
        return {
          name: 'foo',
          stages: {
            bar: {},
          },
        };
      });

      const pipeline = await Pipeline.resolve(workDir);
      assert(pipeline instanceof Pipeline);
    });
  });

  describe('constructor', () => {
    it('create new pipeline', () => {
      Stage.putAdapter('foo', class {
        static test () {
          return true;
        }

        static validate (config) {
          return config;
        }
      });

      const pipeline = new Pipeline(workDir, {
        version: '1',
        name: 'foo',
        stages: {
          bar: {},
        },
      });

      assert.strictEqual(pipeline.workDir, workDir);
      assert.strictEqual(pipeline.name, 'foo');
      assert.strictEqual(pipeline.stages.bar.name, 'bar');
      assert.strictEqual(pipeline.stages.bar.type, 'foo');
    });
  });

  describe('#dump()', () => {
    it('dump configuration', () => {
      Stage.putAdapter('foo', class {
        static test () {
          return true;
        }

        static validate (config) {
          return config;
        }
      });

      const pipeline = new Pipeline(workDir, {
        version: '1',
        name: 'foo',
        stages: {
          bar: {},
        },
      });

      const config = pipeline.dump();
      assert.strictEqual(config.version, '1');
      assert.strictEqual(config.name, 'foo');
      assert(!config.workDir);
    });
  });

  describe('#run()', () => {
    it('run all stages', async () => {
      Stage.putAdapter('foo', class {
        static test () {
          return true;
        }

        static validate (config) {
          return config;
        }
      });

      const pipeline = new Pipeline(workDir, {
        version: '1',
        name: 'foo',
        stages: {
          bar: {},
        },
      });

      const logs = [];
      pipeline.stages = {
        foo: {
          run () {
            logs.push('foo');
          },
        },
        bar: {
          run () {
            logs.push('bar');
          },
        },
      };

      await pipeline.run();
      assert.deepStrictEqual(logs, ['foo', 'bar']);
    });
  });

  describe('#abort()', () => {
    it('abort all stages', async () => {
      Stage.putAdapter('foo', class {
        static test () {
          return true;
        }

        static validate (config) {
          return config;
        }
      });

      const pipeline = new Pipeline(workDir, {
        version: '1',
        name: 'foo',
        stages: {
          bar: {},
        },
      });

      const logs = [];
      pipeline.stages = {
        foo: {
          abort () {
            logs.push('foo');
          },
        },
        bar: {
          abort () {
            logs.push('bar');
          },
        },
      };

      await pipeline.abort();
      assert.deepStrictEqual(logs, ['foo', 'bar']);
    });
  });
});
