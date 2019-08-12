const configure = require('../../configurators/cicd')();
const path = require('path');
const fs = require('fs');
const { mkdirp, rmrf, writeFile } = require('fser');
const assert = require('assert');
// const debug = require('debug')('cicd:test:configurators:cicd');

describe('configurators:cicd', () => {
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

  it('return configuration from cicd.yml', async () => {
    await writeFile(fs, path.join(workDir, 'cicd.yml'), `
  version: "1"
  stages:
    foo:
      files: [ "docker-compose.yml" ]
    `);

    const result = await configure({ workDir });
    assert.strictEqual(result.version, '1');
    assert(result.stages.foo);
  });

  it('return configuration from cicd.yaml', async () => {
    await writeFile(fs, path.join(workDir, 'cicd.yaml'), `
  version: "1"
  stages:
    foo:
      files: [ "docker-compose.yml" ]
    `);

    const result = await configure({ workDir });
    assert.strictEqual(result.version, '1');
    assert(result.stages.foo);
  });
});
