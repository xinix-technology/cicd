const assert = require('assert');
const Adapter = require('../../adapters/docker');
const { Docker } = require('../../lib/docker');

describe('adapters:DockerAdapter', () => {
  describe('.test()', () => {
    it('return true if config has type docker', () => {
      assert(Adapter.test({ type: 'docker' }));
    });

    it('return true if has dockerfile', () => {
      assert(Adapter.test({
        dockerfile: 'Dockerfile',
      }));
    });

    it('return false otherwise', () => {
      assert(!Adapter.test({}));
    });
  });

  describe('.validate()', () => {
    it('append type if not exist yet', () => {
      const config = Adapter.validate({
        dockerfile: 'Dockerfile',
      });

      assert.strictEqual(config.type, 'docker');
    });

    it('append dockerfile with default dockerfile if not exist yet', () => {
      const config = Adapter.validate({
        type: 'docker',
      });

      assert.strictEqual(config.dockerfile, 'Dockerfile');
    });

    it('state detach explicitly', () => {
      const config = Adapter.validate({
        type: 'docker',
        dockerfile: 'Dockerfile',
      });

      assert.strictEqual(config.detach, false);

      {
        const config = Adapter.validate({
          type: 'docker',
          dockerfile: 'Dockerfile',
          detach: true,
        });

        assert.strictEqual(config.detach, true);
      }
    });
  });

  describe('instance', () => {
    beforeEach(() => {
      Docker.reset({
        mock: true,
      });
    });

    afterEach(() => {
      Docker.reset();
    });

    describe('#run()', () => {
      it('run stage', async () => {
        const stage = { pipeline: { name: 'foo' }, name: 'bar' };
        const adapter = new Adapter(stage);
        await adapter.run();

        assert.strictEqual(Docker.LOGS[0][0], 'build');
        assert.strictEqual(Docker.LOGS[1][0], 'run');
        assert.strictEqual(Docker.LOGS[2][0], 'rm');
        assert.strictEqual(Docker.LOGS[3][0], 'image');
        assert.strictEqual(Docker.LOGS[3][1], 'rm');
      });
    });

    describe('#abort()', () => {
      it('abort stage', async () => {
        const stage = { pipeline: { name: 'foo' }, name: 'bar' };
        const adapter = new Adapter(stage);
        await adapter.abort();

        assert.strictEqual(Docker.LOGS[0][0], 'rm');
        assert.strictEqual(Docker.LOGS[1][0], 'image');
        assert.strictEqual(Docker.LOGS[1][1], 'rm');
      });
    });
  });
});
