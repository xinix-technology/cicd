const { Registry } = require('..');
const assert = require('assert');
// const debug = require('debug')('cicd:test:registry');

describe('Registry', () => {
  describe('.getInstance()', () => {
    it('return singleton', () => {
      const registry = Registry.getInstance();
      assert(registry instanceof Registry);
      assert.strictEqual(registry, Registry.getInstance());
    });

    it('has default runner adapters', () => {
      const registry = Registry.getInstance();
      assert.strictEqual(registry.runners.length, 3);
    });

    it('has default configurators', () => {
      const registry = Registry.getInstance();
      assert.strictEqual(registry.configurators.length, 3);
    });
  });

  describe('#addRunnerAdapter()', () => {
    it('add new runner adapter', () => {
      const registry = new Registry();
      assert.strictEqual(registry.runners.length, 0);
      registry.addRunnerAdapter(function () {});
      assert.strictEqual(registry.runners.length, 1);
    });
  });

  describe('#removeRunnerAdapter()', () => {
    it('remove runner adapter', () => {
      const registry = new Registry();

      const Runner = function () {};
      registry.runners.push(Runner);

      registry.removeRunnerAdapter(Runner);
      assert.strictEqual(registry.runners.length, 0);
    });
  });

  describe('#addConfigurator()', () => {
    it('add new configurator', () => {
      const registry = new Registry();
      assert.strictEqual(registry.configurators.length, 0);
      registry.addConfigurator(function () {});
      assert.strictEqual(registry.configurators.length, 1);
    });
  });

  describe('#removeConfigurator()', () => {
    it('remove configurator', () => {
      const registry = new Registry();

      const configure = function () {};
      registry.configurators.push(configure);

      registry.removeConfigurator(configure);
      assert.strictEqual(registry.configurators.length, 0);
    });
  });

  describe('#configure()', () => {
    it('return configuration from suitable configurator', async () => {
      const registry = new Registry();

      const configure = () => (
        {
          version: '1',
          stages: {
            foo: {
              dockerfile: 'Dockerfile',
            },
          },
        }
      );
      registry.configurators.push(configure);

      const { version, stages } = await registry.configure({});
      assert.strictEqual(version, '1');
      assert.strictEqual(stages.foo.dockerfile, 'Dockerfile');
    });
  });

  describe('#createRunner()', () => {
    it('create runner from stage', () => {
      const registry = new Registry();

      class FooRunner {
        static test ({ foo }) {
          return Boolean(foo);
        }
      }

      class BarRunner {
        static test ({ bar }) {
          return Boolean(bar);
        }
      }

      registry.runners.push(FooRunner);
      registry.runners.push(BarRunner);

      const fooStage = { foo: 'foo' };
      const barStage = { bar: 'bar' };

      const fooRunner = registry.createRunner(fooStage);
      assert(fooRunner instanceof FooRunner);
      const barRunner = registry.createRunner(barStage);
      assert(barRunner instanceof BarRunner);
    });
  });
});
