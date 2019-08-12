
const { Docker, Logger } = require('..');

class BuildRunner {
  static test (stage) {
    return Boolean(stage.options && stage.options.tag && stage.options.dockerfile);
  }

  constructor (stage, options = {}) {
    this.stage = stage;
    this.Docker = options.Docker || Docker;
  }

  async run ({ env, logger = Logger.getInstance() }) {
    const { workDir, canonicalName } = this.stage;
    const { dockerfile: file, tag } = this.stage.options;

    const docker = new this.Docker({ workDir, file, env, name: tag });

    logger.log({ topic: 'head', message: `Building image ${canonicalName} with tag "${tag}" ...` });

    await docker.build();
  }

  abort ({ env, logger = Logger.getInstance() }) {
    const { canonicalName } = this.stage;
    const { tag } = this.stage.options;

    logger.log({ topic: 'head', message: `Do nothing to abort building ${canonicalName} with tag "${tag}" ...` });
  }

  dump () {
    return {
      detach: !!this.stage.options.detach,
      dockerfile: this.stage.options.dockerfile,
    };
  }
}

module.exports = BuildRunner;
