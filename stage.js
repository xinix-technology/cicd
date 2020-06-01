const ADAPTERS = {};

class Stage {
  static get ADAPTERS () {
    return ADAPTERS;
  }

  static reset (empty = false) {
    for (const key in ADAPTERS) {
      delete ADAPTERS[key];
    }

    if (!empty) {
      Stage.putAdapter('stack', require('./adapters/stack'));
      Stage.putAdapter('compose', require('./adapters/compose'));
      Stage.putAdapter('docker', require('./adapters/docker'));
      Stage.putAdapter('build', require('./adapters/build'));
    }
  }

  static putAdapter (type, Adapter) {
    ADAPTERS[type] = Adapter;
  }

  static findSuitableAdapterType (config) {
    for (const type in ADAPTERS) {
      const Adapter = ADAPTERS[type];
      if (Adapter.test(config)) {
        return type;
      }
    }
  }

  static validate (config) {
    const { name, type = Stage.findSuitableAdapterType(config) } = config;

    if (!name) {
      throw new Error('Name must be specified');
    }

    const Adapter = ADAPTERS[type];

    if (!type || !Adapter) {
      throw new Error('Unknown adapter type');
    }

    return {
      name,
      type,
      ...Adapter.validate(config),
    };
  }

  constructor (pipeline, config) {
    config = Stage.validate(config);

    this.name = config.name;
    this.type = config.type;
    this.detach = !!config.detach;

    Object.assign(this, config);

    const Adapter = ADAPTERS[this.type];
    const adapter = new Adapter(this);
    Object.defineProperties(this, {
      pipeline: {
        get () {
          return pipeline;
        },
      },
      adapter: {
        get () {
          return adapter;
        },
      },
    });
  }

  get workDir () {
    return this.pipeline.workDir;
  }

  dump () {
    const config = {
      ...this,
    };

    delete config.pipeline;
    delete config.name;

    return config;
  }

  async run ({ env, labels, attach = false, logger = () => undefined } = {}) {
    const stageLogger = log => {
      log.pipeline = this.pipeline.name;
      log.stage = this.name;
      logger(log);
    };

    if (attach) {
      this.detach = false;
    }

    labels = {
      ...labels,
      'id.sagara.cicd.pipeline': this.pipeline.name,
      'id.sagara.cicd.stage': this.name,
    };

    await this.adapter.run({ env, labels, logger: stageLogger });
  }

  async abort ({ env, labels, logger = () => undefined } = {}) {
    const stageLogger = log => {
      log.pipeline = this.pipeline.name;
      log.stage = this.name;
      logger(log);
    };

    labels = {
      ...labels,
      'id.sagara.cicd.pipeline': this.pipeline.name,
      'id.sagara.cicd.stage': this.name,
    };

    await this.adapter.abort({ env, labels, logger: stageLogger });
  }
}

Stage.reset();

module.exports = { Stage };
