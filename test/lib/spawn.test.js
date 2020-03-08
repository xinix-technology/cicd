const spawn = require('../../lib/spawn');
const assert = require('assert');

describe('lib:spawn()', () => {
  it('run and log', async () => {
    const logs = [];
    const logger = log => logs.push(log);
    await spawn('ls', ['-la'], { logger });
    assert.strictEqual(!!logs.length, true);
  });

  it('run and return value', async () => {
    const result = await spawn('ls', ['-la']);
    assert.strictEqual(result.code, 0);
    assert.strictEqual(!!result.stdout, true);
    assert.strictEqual(!!result.stderr, false);
  });
});
