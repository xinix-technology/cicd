const assert = require('assert');
const DockerRunner = require('../../runners/docker');
// const debug = require('debug')('cicd:test:runners:docker');

describe('runners:DockerRunner', () => {
  let activities = [];
  class Docker {
    build () {
      activities.push(['build']);
    }

    run () {
      activities.push(['run']);
    }

    rm () {
      activities.push(['rm']);
    }

    rmi () {
      activities.push(['rmi']);
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
    it('return true if stage has dockerfile', () => {
      assert.strictEqual(DockerRunner.test({}), false);
      assert.strictEqual(DockerRunner.test({ options: { dockerfile: 'Dockerfile' } }), true);
    });
  });

  describe('#run()', () => {
    it('run docker', async () => {
      const stage = {
        name: 'bar',
        canonicalName: 'foo:bar',
        options: {
          dockerfile: 'Dockerfile',
        },
      };
      const runner = new DockerRunner(stage, { Docker });

      await runner.run({ env, logger });

      assert.strictEqual(activities[0][0], 'build');
      assert.strictEqual(activities[1][0], 'run');
      assert.strictEqual(activities[2][0], 'rm');
      assert.strictEqual(activities[3][0], 'rmi');
    });
  });

  describe('#abort()', () => {
    it('abort docker', async () => {
      const stage = {
        name: 'bar',
        canonicalName: 'foo:bar',
        options: {
          dockerfile: 'Dockerfile',
        },
      };
      const runner = new DockerRunner(stage, { Docker });

      await runner.abort({ env, logger });
      assert.strictEqual(activities[0][0], 'rm');
      assert.strictEqual(activities[1][0], 'rmi');
    });
  });
});
