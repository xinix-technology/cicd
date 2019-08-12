const { Registry } = require('./registry');
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

  async run ({ env }) {
    await this.runner.run({ env });
  }

  async abort ({ env }) {
    await this.runner.abort({ env });
  }

  dump () {
    return this.runner.dump();
  }
}

module.exports = { Stage };
