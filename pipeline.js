const { Stage } = require('./stage');
const { Logger } = require('./logger');
const { Registry } = require('./registry');
const path = require('path');
// const debug = require('debug')('cicd:pipeline');

class Pipeline {
  constructor ({
    workDir,
    name,
    logger = new Logger(),
  } = {}) {
    if (!workDir) {
      throw new Error('Undefined working directory');
    }

    this.workDir = workDir;
    this.name = name || path.basename(workDir);
    this.logger = logger;
    this.stages = [];
    this.configured = false;
  }

  async configure (config) {
    if (!config) {
      config = await Registry.getInstance().configure(this);
    }

    const { version, stages } = config;

    if (!version) {
      throw new Error('Undefined version');
    }

    for (const name in stages) {
      const stage = new Stage({
        name,
        ...stages[name],
        pipeline: this,
      });

      this.stages.push(stage);
    }

    this.configured = true;
  }

  getStage (name) {
    if (!this.configured) {
      throw new Error('Not configured yet');
    }

    return this.stages.find(stage => stage.name === name);
  }

  async run ({ env }) {
    this.logger.log({ topic: 'head', message: `Running ${this.name} ...` });

    for (const stage of this.stages) {
      await stage.run({ env });
    }
  }

  async abort ({ env }) {
    this.logger.log({ topic: 'head', message: `Aborting ${this.name} ...` });

    for (const stage of this.stages) {
      await stage.abort({ env });
    }
  }
}

module.exports = { Pipeline };
