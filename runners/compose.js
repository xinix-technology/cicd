
const { Compose, Logger } = require('..');

class ComposeRunner {
  static test (stage) {
    return Boolean(stage.options && stage.options.files && stage.options.files.length);
  }

  constructor (stage, options = {}) {
    this.stage = stage;
    this.Compose = options.Compose || Compose;
  }

  async run ({ env, logger = Logger.getInstance() }) {
    const { workDir, canonicalName, detach } = this.stage;
    const { files } = this.stage.options;

    const compose = new this.Compose({ workDir, files, env, logger });
    try {
      try {
        logger.log({ topic: 'head', message: `Preparing ${canonicalName} ...` });

        await compose.pull();
      } catch (err) {
        logger.log({ topic: 'error', message: 'Compose image pull failed' });
      }

      await compose.build();

      logger.log({ topic: 'head', message: `Running ${canonicalName} ...` });

      await compose.up({ detach });
    } finally {
      if (!detach) {
        try {
          await compose.down();
        } catch (err) {
          // noop
        }
      }
    }
  }

  async abort ({ env, logger = Logger.getInstance() }) {
    const { canonicalName, workDir, detach } = this.stage;
    const { files } = this.stage.options;

    const compose = new this.Compose({ workDir, files, env, logger });
    try {
      logger.log({ topic: 'head', message: `Aborting ${canonicalName} ...` });
      await compose.down({ detach });
    } catch (err) {
      logger.log({ topic: 'error', message: `Abort failed caused by: ${err}` });
    }
  }

  dump () {
    return {
      detach: !!this.stage.options.detach,
      files: this.stage.options.files,
    };
  }
}

module.exports = ComposeRunner;
