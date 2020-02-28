const { Docker } = require('../lib/docker');

class DockerAdapter {
  static get type () {
    return 'docker';
  }

  static test ({ type, dockerfile }) {
    return (type && type === DockerAdapter.type) || !!dockerfile;
  }

  static validate ({ detach = false, dockerfile = 'Dockerfile' }) {
    return {
      type: DockerAdapter.type,
      detach,
      dockerfile,
    };
  }

  constructor (stage) {
    this.stage = stage;
  }

  get cannonicalName () {
    return `${this.stage.pipeline.name}_${this.stage.name}`;
  }

  async run ({ env, logger = () => undefined } = {}) {
    const { workDir, detach, dockerfile } = this.stage;

    const name = this.cannonicalName;
    const docker = new Docker({ workDir, file: dockerfile, env, name, logger });

    try {
      logger({ level: 'head', message: 'Building image ...' });
      await docker.build();

      if (detach) {
        try {
          logger({ level: 'head', message: 'Removing running container if exists ...' });
          await docker.rm();
        } catch (err) {
          // noop
        }

        logger({ level: 'head', message: 'Running ...' });
        await docker.create();
        await docker.start();
      } else {
        logger({ level: 'head', message: 'Running ...' });
        await docker.run();
      }
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

  async abort ({ env, logger = () => undefined } = {}) {
    const { workDir, dockerfile } = this.stage;

    const name = this.cannonicalName;
    const docker = new Docker({ workDir, file: dockerfile, env, name, logger });

    try {
      logger({ level: 'head', message: 'Aborting ...' });
      await docker.rm();
      await docker.rmi();
    } catch (err) {
      logger({ level: 'error', message: `Abort failed caused by: ${err}` });
    }
  }
}

module.exports = DockerAdapter;
