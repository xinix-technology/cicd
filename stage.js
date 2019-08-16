const { Registry } = require('./registry');
const { Logger } = require('./logger');

class Stage {
  constructor ({ name, pipeline, ...options }) {
    this.name = name;
    this.options = options;
    this.pipeline = pipeline;
  }

  get canonicalName () {
    return `${this.pipeline.name}:${this.name}`;
  }

  get workDir () {
    return this.pipeline.workDir;
  }

  get detach () {
    return !!this.options.detach;
  }

  get runner () {
    if (!this._runner) {
      this._runner = Registry.getInstance().createRunner(this);
    }

    return this._runner;
  }

  async run ({ env, logger = Logger.getInstance() }) {
    await this.runner.run({ env, logger });
  }

  async abort ({ env, logger = Logger.getInstance() }) {
    await this.runner.abort({ env, logger });
  }

  dump () {
    return this.runner.dump();
  }
}

module.exports = { Stage };
