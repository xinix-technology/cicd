const path = require('path');
const fs = require('fs-extra');
const assert = require('assert');
const resolve = require('../../resolvers/cicd')();

const CICD_DATA = `
version: '1'
stages:
  foo:
  bar:
`.trim();

describe('resolvers:cicd', () => {
  const workDir = path.resolve(process.cwd(), 'tmp-test');

  beforeEach(async () => {
    await fs.ensureDir(workDir);
  });

  afterEach(async () => {
    await fs.remove(workDir);
  });

  it('resolve directory with cicd.yml', async () => {
    await fs.writeFile(path.join(workDir, 'cicd.yml'), CICD_DATA);

    const config = await resolve(workDir);

    assert.strictEqual(config.version, '1');
    assert('foo' in config.stages);
    assert('bar' in config.stages);
    assert(!('baz' in config.stages));
  });

  it('resolve directory with cicd.yaml', async () => {
    await fs.writeFile(path.join(workDir, 'cicd.yaml'), CICD_DATA);

    const config = await resolve(workDir);

    assert.strictEqual(config.version, '1');
    assert('foo' in config.stages);
    assert('bar' in config.stages);
    assert(!('baz' in config.stages));
  });

  it('does not resolve directory without cicd config', async () => {
    const config = await resolve(workDir);
    assert.strictEqual(config, undefined);
  });
});
