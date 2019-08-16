const { Stage } = require('./stage');
const { Logger } = require('./logger');
const { Registry } = require('./registry');
const path = require('path');
const yaml = require('js-yaml');
// const debug = require('debug')('cicd:pipeline');

class Pipeline {
  constructor ({
    workDir,
    name,
  } = {}) {
    if (!workDir) {
      throw new Error('Undefined working directory');
    }

    this.workDir = workDir;
    this.name = name || path.basename(workDir);
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
    this.assertConfigure();

    return this.stages.find(stage => stage.name === name);
  }

  dump () {
    this.assertConfigure();

    const config = {
      version: Registry.CURRENT_VERSION,
    };

    this.stages.forEach(stage => {
      const stages = config.stages = config.stages || {};
      stages[stage.name] = stage.dump();
    });

    return yaml.dump(config);
  }

  async run ({ env, logger = Logger.getInstance() }) {
    this.assertConfigure();

    logger.log({ topic: 'head', message: `Running ${this.name} ...` });

    for (const stage of this.stages) {
      await stage.run({ env, logger });
    }
  }

  async abort ({ env, logger = Logger.getInstance() }) {
    this.assertConfigure();

    logger.log({ topic: 'head', message: `Aborting ${this.name} ...` });

    for (const stage of this.stages) {
      await stage.abort({ env, logger });
    }
  }

  assertConfigure () {
    if (!this.configured) {
      throw new Error('Not configured yet');
    }
  }
}

module.exports = { Pipeline };
