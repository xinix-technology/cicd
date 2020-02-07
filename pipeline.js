const { Stage } = require('./stage');
const path = require('path');

const CONFIG_VERSION = '1';
const RESOLVERS = [];

class Pipeline {
  static get RESOLVERS () {
    return RESOLVERS;
  }

  static reset (empty = false) {
    RESOLVERS.splice(0);

    if (!empty) {
      Pipeline.addResolver(require('./resolvers/cicd')());
      Pipeline.addResolver(require('./resolvers/compose')());
      Pipeline.addResolver(require('./resolvers/docker')());
    }
  }

  static addResolver (resolver) {
    RESOLVERS.push(resolver);
  }

  static async resolve (workDir) {
    for (const resolve of RESOLVERS) {
      const config = await resolve(workDir);
      const name = path.basename(workDir);
      if (config) {
        return new Pipeline(workDir, {
          version: CONFIG_VERSION,
          name,
          ...config,
        });
      }
    }

    throw new Error('Failed to resolve working directory');
  }

  static validate ({ version, name, stages = {} }) {
    if (!version) {
      throw new Error('Version must be specified');
    }

    if (!name) {
      throw new Error('Name must be specified');
    }

    if (!stages || !Object.keys(stages).length) {
      throw new Error('Stages cannot be empty');
    }

    return {
      version,
      name,
      stages,
    };
  }

  constructor (workDir, config) {
    this.workDir = workDir;

    const { version, name, stages } = Pipeline.validate(config);

    this.version = version;
    this.name = name;
    this.stages = {};

    for (const name in stages) {
      this.stages[name] = new Stage(this, {
        ...stages[name],
        name,
      });
    }
  }

  dump () {
    const { version, name } = this;
    const stages = {};
    for (const name in this.stages) {
      stages[name] = this.stages[name].dump();
    }

    return {
      version,
      name,
      stages,
    };
  }

  async run ({ env, logger = () => undefined } = {}) {
    logger({ pipeline: this.name, level: 'head', message: `Running ${this.name} ...` });

    for (const name in this.stages) {
      await this.stages[name].run({ env, logger });
    }
  }

  async abort ({ env, logger = () => undefined } = {}) {
    logger({ pipeline: this.name, level: 'head', message: `Aborting ${this.name} ...` });

    for (const name in this.stages) {
      await this.stages[name].abort({ env, logger });
    }
  }

  getStage (name) {
    const stage = this.stages[name];
    if (!stage) {
      throw new Error('Stage not found');
    }
    return stage;
  }
}

Pipeline.reset();

module.exports = { Pipeline };
