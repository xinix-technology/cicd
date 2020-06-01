const path = require('path');
const fs = require('fs-extra');
const assert = require('assert');
const resolve = require('../../resolvers/docker')();

const DOCKER_DATA = `
FROM alpine
`.trim();

const workDir = path.resolve(process.cwd(), 'tmp-test');

describe('resolvers:docker', () => {
  beforeEach(async () => {
    await fs.ensureDir(workDir);
  });

  afterEach(async () => {
    await fs.remove(workDir);
  });

  it('resolve directory with Dockerfile', async () => {
    await fs.writeFile(path.join(workDir, 'Dockerfile'), DOCKER_DATA);

    const config = await resolve(workDir);

    assert.strictEqual(config.stages.main.type, 'docker');
    assert.strictEqual(config.stages.main.detach, true);
    assert.strictEqual(config.stages.main.dockerfile, 'Dockerfile');
  });

  it('does not resolve directory without Dockerfile', async () => {
    const config = await resolve(workDir);
    assert.strictEqual(config, undefined);
  });
});
