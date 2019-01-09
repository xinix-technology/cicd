const { Config } = require('./config');
const { Logger } = require('./logger');

class Cicd {
  constructor ({ workDir, name, logger = new Logger() }) {
    this.workDir = workDir;
    this.name = name;
    this.logger = logger;
    this.config = new Config({ workDir });

    this.runnerAdapters = [
      require('./runners/compose'),
      require('./runners/docker'),
    ];
  }

  addRunnerAdapter (Runner) {
    let index = this.runnerAdapters.indexOf(Runner);
    if (index !== -1) {
      throw new Error('Runner adapter already exists');
    }

    this.runnerAdapters.push(Runner);
  }

  removeRunnerAdapter (Runner) {
    let index = this.runnerAdapters.indexOf(Runner);
    if (index !== -1) {
      this.runnerAdapters.splice(index, 1);
    }
  }

  log ({ topic, message }) {
    this.logger.log({ topic, message });
  }

  async getConfig () {
    await this.config.load();
    return this.config;
  }

  async getRunner (stageName) {
    let { stages } = await this.getConfig();

    let stage = stages[stageName];
    if (!stage) {
      throw new Error(`Stage ${stageName} not found`);
    }

    let Runner = this.runnerAdapters.find(runner => runner.test(stage));
    if (!Runner) {
      throw new Error(`Missing runner adapter for stage ${stageName}`);
    }

    return new Runner(this, stage);
  }

  async run (stageName, { env }) {
    let runner = await this.getRunner(stageName);
    await runner.run({ env });
  }

  async abort (stageName, { env }) {
    let runner = await this.getRunner(stageName);
    await runner.abort({ env });
  }
}

module.exports = { Cicd };
