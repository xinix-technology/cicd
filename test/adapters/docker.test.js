const assert = require('assert');
const Adapter = require('../../adapters/docker');
const { Docker } = require('../../lib/docker');
const path = require('path');
const fs = require('fs-extra');
const spawn = require('../../lib/spawn');

describe('adapters:DockerAdapter', () => {
  describe('.test()', () => {
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
    const workDir = path.join(process.cwd(), 'tmp_test/foo');

    beforeEach(async () => {
      Docker.reset();
      try {
        await spawn('docker', ['rm', '-f', 'foo_bar.0']);
      } catch (err) {
        // noop
      }
      await fs.ensureDir(workDir);
      await fs.writeFile(path.join(workDir, 'Dockerfile'), `
FROM alpine

CMD ["ping", "127.0.0.1"]
      `.trim());
    });

    afterEach(async () => {
      Docker.reset();
      try {
        await spawn('docker', ['rm', '-f', 'foo_bar.0']);
      } catch (err) {
        // noop
      }
      await fs.remove(path.dirname(workDir));
    });

    describe('#run()', () => {
      it('run stage', async () => {
        const stage = { pipeline: { name: 'foo' }, name: 'bar', workDir, detach: true };
        const adapter = new Adapter(stage);
        await adapter.run();

        const { stdout } = await spawn('docker', ['inspect', 'foo_bar.0']);
        const json = JSON.parse(stdout);

        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.pipeline'], 'foo');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.stage'], 'bar');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.vhost'], undefined);
      });

      it('run stage with vhost', async () => {
        const stage = { pipeline: { name: 'foo' }, name: 'bar', workDir, detach: true };
        const adapter = new Adapter(stage);
        const env = {
          CICD_VHOST: '1',
        };
        await adapter.run({ env });

        const { stdout } = await spawn('docker', ['inspect', 'foo_bar.0']);
        const json = JSON.parse(stdout);

        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.pipeline'], 'foo');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.stage'], 'bar');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.vhost'], '1');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.vhost.domain'], 'foo');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.vhost.port'], '443');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.vhost.upstream_port'], '3000');
      });
    });

    describe('#abort()', () => {
      it('abort stage', async () => {
        const stage = { pipeline: { name: 'foo' }, name: 'bar' };
        const adapter = new Adapter(stage);
        await adapter.abort();
      });
    });
  });
});
