const path = require('path');
const fs = require('fs-extra');
const assert = require('assert');
const resolve = require('../../resolvers/compose')();

const COMPOSE_DATA = `
version: '3'
services:
  foo:
    image: alpine
    command: ['ping', 'goo.gl']
`.trim();

const workDir = path.resolve(process.cwd(), 'tmp-test');

describe('resolvers:compose', () => {
  beforeEach(async () => {
    await fs.ensureDir(workDir);
  });

  afterEach(async () => {
    await fs.remove(workDir);
  });

  it('resolve directory with docker-compose.yml', async () => {
    await fs.writeFile(path.join(workDir, 'docker-compose.yml'), COMPOSE_DATA);

    const config = await resolve(workDir);

    assert.strictEqual(config.stages.main.type, 'compose');
    assert.strictEqual(config.stages.main.detach, true);
    assert.deepStrictEqual(config.stages.main.files, ['docker-compose.yml']);
  });

  it('resolve directory with docker-compose.yaml', async () => {
    await fs.writeFile(path.join(workDir, 'docker-compose.yaml'), COMPOSE_DATA);

    const config = await resolve(workDir);

    assert.strictEqual(config.stages.main.type, 'compose');
    assert.strictEqual(config.stages.main.detach, true);
    assert.deepStrictEqual(config.stages.main.files, ['docker-compose.yaml']);
  });

  it('does not resolve directory without compose config', async () => {
    const config = await resolve(workDir);
    assert.strictEqual(config, undefined);
  });
});
