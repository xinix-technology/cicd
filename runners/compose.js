
const { Compose } = require('../compose');

class ComposeRunner {
  static test (stage) {
    return Boolean(stage.files && stage.files.length);
  }

  constructor (cicd, stage) {
    this.cicd = cicd;
    this.stage = stage;
  }

  async run () {
    let { name, workDir, env } = this.cicd;
    let { name: stageName, detach, files } = this.stage;

    let compose = new Compose({ workDir, files, env });
    compose.on('log', log => this.cicd.log(log));

    try {
      try {
        this.cicd.log({ topic: 'head', message: `Preparing ${name}:${stageName} ...` });

        await compose.pull();
      } catch (err) {
        this.cicd.log({ topic: 'error', message: 'Compose image pull failed' });
      }

      await compose.build();

      this.cicd.log({ topic: 'head', message: `Running ${name}:${stageName} ...` });

      await compose.up({ detach });
    } finally {
      compose.removeAllListeners('log');
    }
  }

  async abort () {
    let { name, workDir, env } = this.cicd;
    let { name: stageName, detach, files } = this.stage;

    let compose = new Compose({ workDir, files, env });
    compose.on('log', log => this.cicd.log(log));

    try {
      this.cicd.log({ topic: 'head', message: `Aborting ${name}:${stageName} ...` });
      await compose.down({ detach });
    } catch (err) {
      this.cicd.log({ topic: 'error', message: `Abort failed caused by: ${err}` });
    } finally {
      compose.removeAllListeners('log');
    }
  }
}

module.exports = ComposeRunner;
