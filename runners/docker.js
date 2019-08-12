
const { Docker, Logger } = require('..');

class DockerRunner {
  static test (stage) {
    return Boolean(stage.options && stage.options.dockerfile);
  }

  constructor (stage, options = {}) {
    this.stage = stage;
    this.Docker = options.Docker || Docker;
  }

  async run ({ env, logger = Logger.getInstance() }) {
    const { workDir, canonicalName, detach, options } = this.stage;
    const file = options.dockerfile;
    const name = `${canonicalName.replace(':', '_')}.docker.cicd`;

    const docker = new this.Docker({ workDir, file, env, name });

    try {
      logger.log({ topic: 'head', message: `Building image ${canonicalName} ...` });

      await docker.build();

      logger.log({ topic: 'head', message: `Running ${canonicalName} ...` });

      await docker.run();
    } finally {
      if (!detach) {
        try {
          await docker.rm();
        } catch (err) {
          // noop
        }

        try {
          await docker.rmi();
        } catch (err) {
          // noop
        }
      }
    }
  }

  async abort ({ env, logger = Logger.getInstance() }) {
    const { workDir, canonicalName, options } = this.stage;
    const file = options.dockerfile;
    const name = `${canonicalName.replace(':', '_')}.docker.cicd`;

    const docker = new this.Docker({ workDir, file, env, name });

    try {
      logger.log({ topic: 'head', message: `Aborting ${canonicalName} ...` });

      await docker.rm();
      await docker.rmi();
    } catch (err) {
      logger.log({ topic: 'error', message: `Abort failed caused by: ${err}` });
    }
  }
}

module.exports = DockerRunner;
