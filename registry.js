// const debug = require('debug')('cicd:registry');

let instance;

class Registry {
  static CURRENT_VERSION = '1';

  static getInstance () {
    if (!instance) {
      instance = new Registry();

      instance.addRunnerAdapter(require('./runners/compose'));
      instance.addRunnerAdapter(require('./runners/docker'));

      instance.addConfigurator(require('./configurators/default')());
      instance.addConfigurator(require('./configurators/compose')());
      instance.addConfigurator(require('./configurators/docker')());
    }

    return instance;
  }

  static setInstance (newInstance) {
    instance = newInstance;
  }

  static resetInstance () {
    instance = undefined;
  }

  constructor () {
    this.runners = [];
    this.configurators = [];
  }

  addRunnerAdapter (adapter) {
    const index = this.runners.indexOf(adapter);
    if (index !== -1) {
      throw new Error('Runner adapter already exists');
    }
    this.runners.push(adapter);
  }

  removeRunnerAdapter (adapter) {
    const index = this.runners.indexOf(adapter);
    if (index !== -1) {
      this.runners.splice(index, 1);
    }
  }

  addConfigurator (configurator) {
    const index = this.configurators.indexOf(configurator);
    if (index !== -1) {
      throw new Error('Configurator already exists');
    }
    this.configurators.push(configurator);
  }

  removeConfigurator (configurator) {
    const index = this.configurators.indexOf(configurator);
    if (index !== -1) {
      this.configurators.splice(index, 1);
    }
  }

  async configure (pipeline) {
    for (const configure of this.configurators) {
      const config = await configure(pipeline);
      if (config) {
        return config;
      }
    }

    throw new Error('Unable to resolve configuration');
  }

  createRunner (stage) {
    for (const Runner of this.runners) {
      if (Runner.test(stage)) {
        return new Runner(stage);
      }
    }

    throw new Error('No suitable runner adapter');
  }
}

module.exports = { Registry };
