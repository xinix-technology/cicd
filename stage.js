let ADAPTERS = [];

class Stage {
  static get ADAPTERS () {
    return ADAPTERS;
  }

  static reset (empty = false) {
    ADAPTERS = [];

    if (!empty) {
      Stage.addAdapter(require('./adapters/stack'));
      Stage.addAdapter(require('./adapters/compose'));
      Stage.addAdapter(require('./adapters/docker'));
    }
  }

  static addAdapter (Adapter) {
    if (!Adapter.type) {
      throw new Error('Adapter must have static field with name type');
    }

    ADAPTERS.push(Adapter);
  }

  static findSuitableAdapterType (config) {
    for (const Adapter of ADAPTERS) {
      if (Adapter.test(config)) {
        return Adapter.type;
      }
    }
  }

  static validate (config) {
    const { name, type = Stage.findSuitableAdapterType(config) } = config;

    if (!name) {
      throw new Error('Name must be specified');
    }

    const Adapter = ADAPTERS.find(Adapter => Adapter.type === type);

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

    const Adapter = ADAPTERS.find(Adapter => Adapter.type === this.type);
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

  async run ({ env, attach = false, logger = () => undefined } = {}) {
    const stageLogger = log => {
      log.pipeline = this.pipeline.name;
      log.stage = this.name;
      logger(log);
    };

    if (attach) {
      this.detach = false;
    }

    await this.adapter.run({ env, logger: stageLogger });
  }

  async abort ({ env, logger = () => undefined } = {}) {
    const stageLogger = log => {
      log.pipeline = this.pipeline.name;
      log.stage = this.name;
      logger(log);
    };
    await this.adapter.abort({ env, logger: stageLogger });
  }
}

Stage.reset();

module.exports = { Stage };
