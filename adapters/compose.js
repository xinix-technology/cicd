const { Compose } = require('../lib/compose');
const { Adapter } = require('../adapter');

class ComposeAdapter extends Adapter {
  static test ({ files }) {
    return !!files;
  }

  static validate ({ detach = false, files = ['docker-compose.yml'] }) {
    return { detach, files };
  }

  async run ({ env = {}, logger = () => undefined } = {}) {
    const { workDir, detach, files } = this.stage;

    const compose = new Compose({ workDir, files, env, logger });
    try {
      if (Compose.OPTIONS.pull) {
        try {
          logger({ level: 'head', message: 'Preparing ...' });

          await compose.pull();
        } catch (err) {
          logger({ level: 'error', message: 'Compose image pull failed' });
        }
      }

      await compose.build();

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

      logger({ level: 'head', message: 'Running ...' });

      await compose.up({ detach, labels });
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

  async abort ({ env, logger = () => undefined } = {}) {
    const { workDir, detach, files } = this.stage;

    const compose = new Compose({ workDir, files, env, logger });
    try {
      logger({ level: 'head', message: 'Aborting ...' });
      await compose.down({ detach });
    } catch (err) {
      logger({ level: 'error', message: `Abort failed caused by: ${err}` });
    }
  }
}

module.exports = ComposeAdapter;
