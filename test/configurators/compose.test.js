const configure = require('../../configurators/compose')();
const path = require('path');
const fs = require('fs');
const { mkdirp, rmrf, writeFile } = require('fser');
const assert = require('assert');
// const debug = require('debug')('cicd:test:configurators:compose');

describe('configurators:compose', () => {
  const workDir = path.join(process.cwd(), 'working-test');

  beforeEach(async () => {
    await mkdirp(fs, workDir);
  });

  afterEach(async () => {
    await rmrf(fs, workDir);
  });

  it('return nothing if config file not found', async () => {
    const result = await configure({ workDir });
    assert.strictEqual(result, undefined);
  });

  it('return configuration if config file found', async () => {
    await writeFile(fs, path.join(workDir, 'docker-compose.yml'), ``);

    const result = await configure({ workDir });
    assert.strictEqual(result.version, '1');
    assert.strictEqual(result.stages.main.detach, false);
    assert.strictEqual(result.stages.main.files[0], 'docker-compose.yml');
  });
});
