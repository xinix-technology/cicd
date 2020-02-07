const { Stage } = require('../stage');
const assert = require('assert');

describe('Stage', () => {
  beforeEach(() => {
    Stage.reset(true);
  });

  describe('.addAdapter()', () => {
    it('add new runner adapter', () => {
      assert.throws(() => {
        Stage.addAdapter(class {});
      }, /Adapter must have static field with name type/);

      class Adapter {
        static get type () {
          return 'foo';
        }
      }
      Stage.addAdapter(Adapter);
      assert.strictEqual(Stage.ADAPTERS[Stage.ADAPTERS.length - 1], Adapter);
    });
  });

  describe('.validate()', () => {
    it('validate stage config', () => {
      assert.throws(() => {
        Stage.validate({});
      }, /Name must be specified/);

      assert.throws(() => {
        Stage.validate({
          name: 'bar',
          type: 'foo',
        });
      }, /Unknown adapter type/);

      let validateHit = 0;
      Stage.addAdapter(class FooAdapter {
        static get type () {
          return 'foo';
        }

        static validate (config) {
          validateHit++;
          return config;
        }
      });

      const config = {
        name: 'bar',
        type: 'foo',
      };

      const validated = Stage.validate(config);

      assert.deepStrictEqual(validated, config);
      assert.strictEqual(validateHit, 1);
    });
  });

  describe('constructor', () => {
    it('create new stage', () => {
      Stage.addAdapter(class {
        static get type () {
          return 'foo';
        }

        static test () {
          return true;
        }

        static validate (config) {
          return config;
        }
      });

      const pipeline = {};
      const stage = new Stage(pipeline, {
        name: 'foo',
      });

      assert.strictEqual(stage.pipeline, pipeline);
      assert.strictEqual(stage.name, 'foo');
      assert.strictEqual(stage.type, 'foo');
      assert.strictEqual(stage.detach, false);
    });
  });

  describe('#dump()', () => {
    it('dump configuration', () => {
      Stage.addAdapter(class {
        static get type () {
          return 'foo';
        }

        static test () {
          return true;
        }

        static validate (config) {
          return config;
        }
      });

      const pipeline = {};
      const stage = new Stage(pipeline, {
        name: 'foo',
      });

      const config = stage.dump();
      assert.strictEqual(config.type, 'foo');
      assert.strictEqual(config.detach, false);
    });
  });

  describe('#run()', () => {
    it('run stage', async () => {
      let ran = false;

      Stage.addAdapter(class {
        static get type () {
          return 'foo';
        }

        static test () {
          return true;
        }

        static validate (config) {
          return config;
        }

        run ({ logger }) {
          logger({ level: 'info', message: 'run' });
          ran = true;
        }
      });

      let logFound;
      const logger = (log) => (logFound = log);
      const stage = new Stage({ name: 'bar' }, { name: 'foo' });
      await stage.run({ logger });

      assert(ran);
      assert.strictEqual(logFound.level, 'info');
      assert.strictEqual(logFound.message, 'run');
      assert.strictEqual(logFound.pipeline, 'bar');
      assert.strictEqual(logFound.stage, 'foo');
    });
  });

  describe('#abort()', () => {
    it('abort stage', async () => {
      let aborted = false;

      Stage.addAdapter(class {
        static get type () {
          return 'foo';
        }

        static test () {
          return true;
        }

        static validate (config) {
          return config;
        }

        abort ({ logger }) {
          logger({ level: 'info', message: 'abort' });
          aborted = true;
        }
      });

      let logFound;
      const logger = (log) => (logFound = log);
      const stage = new Stage({ name: 'bar' }, { name: 'foo' });
      await stage.abort({ logger });

      assert(aborted);
      assert.strictEqual(logFound.level, 'info');
      assert.strictEqual(logFound.message, 'abort');
      assert.strictEqual(logFound.pipeline, 'bar');
      assert.strictEqual(logFound.stage, 'foo');
    });
  });
});
