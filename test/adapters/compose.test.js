const assert = require('assert');
const Adapter = require('../../adapters/compose');
const { Compose } = require('../../lib/compose');

describe('adapters:ComposeAdapter', () => {
  describe('.test()', () => {
    it('return true if config has type compose', () => {
      assert(Adapter.test({ type: 'compose' }));
    });

    it('return true if has files', () => {
      assert(Adapter.test({
        files: ['docker-compose.yml'],
      }));
    });

    it('return false otherwise', () => {
      assert(!Adapter.test({}));
    });
  });

  describe('.validate()', () => {
    it('append type if not exist yet', () => {
      const config = Adapter.validate({
        files: ['docker-compose.yml'],
      });

      assert.strictEqual(config.type, 'compose');
    });

    it('append files with default docker-compose.yml if not exist yet', () => {
      const config = Adapter.validate({
        type: 'compose',
      });

      assert.strictEqual(config.files[0], 'docker-compose.yml');
    });

    it('state detach explicitly', () => {
      const config = Adapter.validate({
        type: 'compose',
        files: ['docker-compose.yml'],
      });

      assert.strictEqual(config.detach, false);

      {
        const config = Adapter.validate({
          type: 'compose',
          files: ['docker-compose.yml'],
          detach: true,
        });

        assert.strictEqual(config.detach, true);
      }
    });
  });

  describe('instance', () => {
    beforeEach(() => {
      Compose.reset({
        mock: true,
      });
    });

    afterEach(() => {
      Compose.reset();
    });

    describe('#run()', () => {
      it('run stage', async () => {
        const stage = { pipeline: { name: 'foo' }, name: 'bar' };
        const adapter = new Adapter(stage);
        await adapter.run();

        assert.strictEqual(Compose.LOGS[0][3], 'pull');
        assert.strictEqual(Compose.LOGS[1][3], 'build');
        assert.strictEqual(Compose.LOGS[2][3], 'up');
        assert.strictEqual(Compose.LOGS[3][3], 'down');
      });
    });

    describe('#abort()', () => {
      it('abort stage', async () => {
        const stage = { pipeline: { name: 'foo' }, name: 'bar' };
        const adapter = new Adapter(stage);
        await adapter.abort();

        assert.strictEqual(Compose.LOGS[0][3], 'down');
      });
    });
  });
});
