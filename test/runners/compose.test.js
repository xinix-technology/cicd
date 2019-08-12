const assert = require('assert');
const ComposeRunner = require('../../runners/compose');
// const debug = require('debug')('cicd:test:runners:compose');

describe('runners:ComposeRunner', () => {
  let activities = [];
  class Compose {
    pull () {
      activities.push(['pull']);
    }

    build () {
      activities.push(['build']);
    }

    up () {
      activities.push(['up']);
    }

    down () {
      activities.push(['down']);
    }
  }

  const env = {};
  const logger = {
    log () {},
  };

  beforeEach(() => {
    activities = [];
  });

  describe('.test()', () => {
    it('return true if stage has files', () => {
      assert.strictEqual(ComposeRunner.test({}), false);
      assert.strictEqual(ComposeRunner.test({ options: { files: ['docker-compose.yml'] } }), true);
    });
  });

  describe('#run()', () => {
    it('run compose', async () => {
      const stage = {
        name: 'bar',
        canonicalName: 'foo:bar',
        options: {},
      };
      const runner = new ComposeRunner(stage, { Compose });

      await runner.run({ env, logger });

      assert.strictEqual(activities[0][0], 'pull');
      assert.strictEqual(activities[1][0], 'build');
      assert.strictEqual(activities[2][0], 'up');
    });
  });

  describe('#abort()', () => {
    it('abort compose', async () => {
      const stage = {
        name: 'bar',
        canonicalName: 'foo:bar',
        options: {},
      };
      const runner = new ComposeRunner(stage, { Compose });

      await runner.abort({ env, logger });
      assert.strictEqual(activities[0][0], 'down');
    });
  });
});
