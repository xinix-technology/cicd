const assert = require('assert');
const Adapter = require('../../adapters/compose');
const { Compose } = require('../../lib/compose');
const path = require('path');
const fs = require('fs-extra');
const spawn = require('../../lib/spawn');

describe('adapters:ComposeAdapter', () => {
  describe('.test()', () => {
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
    const workDir = path.join(process.cwd(), 'tmp_test/foo');

    beforeEach(async () => {
      Compose.reset();
      await fs.ensureDir(workDir);
      await fs.writeFile(path.join(workDir, 'docker-compose.yml'), `
version: '3'
services:
  main:
    image: alpine
    command: ["ping", "127.0.0.1"]
      `.trim());
      await spawn('docker-compose', ['down', '-t', '0'], { cwd: workDir });
    });

    afterEach(async () => {
      Compose.reset();
      await spawn('docker-compose', ['down', '-t', '0'], { cwd: workDir });
      await fs.remove(path.dirname(workDir));
    });

    describe('#run()', () => {
      it('run stage', async () => {
        const stage = { pipeline: { name: 'foo', workDir }, name: 'bar', workDir, detach: true };
        const adapter = new Adapter(stage);
        await adapter.run();

        const { stdout } = await spawn('docker', ['inspect', 'foo_main_1']);
        const json = JSON.parse(stdout);
        // console.log(json[0].Config);
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.pipeline'], 'foo');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.stage'], 'bar');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.vhost'], undefined);
      }).timeout(20000);

      it('run stage with vhost', async () => {
        const stage = { pipeline: { name: 'foo', workDir }, name: 'bar', workDir, detach: true };
        const adapter = new Adapter(stage);
        const env = {
          CICD_VHOST: '1',
        };
        await adapter.run({ env });

        const { stdout } = await spawn('docker', ['inspect', 'foo_main_1']);
        const json = JSON.parse(stdout);
        // console.log(json[0].Config);
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.pipeline'], 'foo');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.stage'], 'bar');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.vhost'], '1');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.vhost.domain'], 'foo');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.vhost.port'], '443');
        assert.strictEqual(json[0].Config.Labels['id.sagara.cicd.vhost.upstream_port'], '3000');
      }).timeout(20000);
    });

    describe('#abort()', () => {
      it('abort stage', async () => {
        const stage = { pipeline: { name: 'foo', workDir }, name: 'bar', workDir, detach: true };
        const adapter = new Adapter(stage);
        await adapter.abort();
      });
    });
  });
});
