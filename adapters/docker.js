const { Docker } = require('../lib/docker');
const { Adapter } = require('../adapter');

class DockerAdapter extends Adapter {
  static test ({ dockerfile }) {
    return !!dockerfile;
  }

  static validate ({ detach = false, dockerfile = 'Dockerfile' }) {
    return { detach, dockerfile };
  }

  async run ({ env = {}, logger = () => undefined } = {}) {
    const { workDir, detach, dockerfile } = this.stage;

    const name = this.cannonicalName;
    const docker = new Docker({ workDir, file: dockerfile, env, name, logger });

    try {
      logger({ level: 'head', message: 'Building image ...' });
      await docker.build();

      const labels = {
        'id.sagara.cicd.pipeline': this.stage.pipeline.name,
        'id.sagara.cicd.stage': this.stage.name,
      };

      if (env.CICD_VHOST && detach) {
        labels['id.sagara.cicd.vhost'] = '1';
        labels['id.sagara.cicd.vhost.domain'] = env.CICD_VHOST_DOMAIN || this.stage.pipeline.name;
        labels['id.sagara.cicd.vhost.port'] = env.CICD_VHOST_PORT || Adapter.CONFIG.VHOST_PORT;
        labels['id.sagara.cicd.vhost.upstream_port'] = env.CICD_VHOST_UPSTREAM_PORT ||
          Adapter.CONFIG.VHOST_UPSTREAM_PORT;

        if (env.CICD_VHOST_CERT) {
          labels['id.sagara.cicd.vhost.cert'] = env.CICD_VHOST_CERT;
        }
      }

      if (detach) {
        try {
          logger({ level: 'head', message: 'Removing running container if exists ...' });
          await docker.rm();
        } catch (err) {
          // noop
        }

        logger({ level: 'head', message: 'Running ...' });
        await docker.create({ labels });
        await docker.start();
      } else {
        logger({ level: 'head', message: 'Running ...' });
        await docker.run({ labels });
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
