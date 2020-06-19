const { Adapter } = require('../adapter');
const spawn = require('../lib/spawn');
const yaml = require('js-yaml');
const fs = require('fs-extra');
const path = require('path');

const OVERRIDE_SUFFIX = '.cicd-override-';

const OPTS = {
  bin: 'docker-compose',
};

class ComposeAdapter extends Adapter {
  static test ({ files }) {
    return !!files;
  }

  static validate ({ detach = false, files = ['docker-compose.yml'] }) {
    return { detach, files };
  }

  async run ({ env, labels, logger, networks = [] } = {}) {
    const { detach } = this.stage;

    try {
      await this.prepareOverrideFile({ labels, networks });

      logger({ level: 'head', message: 'Building images ...' });

      await this.composeBuild({ env, logger });

      logger({ level: 'head', message: 'Running ...' });

      await this.composeUp({ env, logger });
    } finally {
      if (!detach) {
        try {
          await this.composeDown({ env, logger });
        } catch (err) {
          // noop
        }
      }
    }
  }

  async abort ({ env, labels, logger } = {}) {
    try {
      await this.prepareOverrideFile({ labels });

      logger({ level: 'head', message: 'Aborting ...' });
      await this.composeDown({ env, logger });
    } catch (err) {
      // noop
    }
  }

  async prepareOverrideFile ({ labels, networks = [] }) {
    const { workDir, files, name } = this.stage;

    const overrideFile = path.join(workDir, `${OVERRIDE_SUFFIX}${name}.yml`);
    await fs.remove(overrideFile);

    const overrides = {
      version: '3',
      services: {},
    };

    for (const i in files) {
      const file = files[i];
      const config = await fs.readFile(path.join(workDir, file));
      const { services } = await yaml.load(config);

      for (const name in services) {
        const serviceLabels = [];
        const serviceNetworks = [];
        for (const k in labels) { // eslint-disable-line max-depth
          serviceLabels.push(`${k}=${labels[k]}`);
        }

        for (const k in networks) {
          const network = networks[k];
          if (!serviceNetworks.includes(network)) { // eslint-disable-line max-depth
            serviceNetworks.push(network);
            overrides.networks = overrides.networks || {};
            overrides.networks[network] = { external: true };
          }
        }

        overrides.services[name] = {
          labels: serviceLabels,
          networks: serviceNetworks,
        };
      }
    }

    await fs.writeFile(overrideFile, yaml.dump(overrides));
  }

  composeBuild ({ env, logger }) {
    const { workDir, files, name } = this.stage;

    const params = ['--no-ansi'];
    for (const i in files) {
      params.push('-f', files[i]);
    }
    params.push('-f', `${OVERRIDE_SUFFIX}${name}.yml`);

    params.push('build', '--parallel');
    return spawn(OPTS.bin, params, { cwd: workDir, env, logger });
  }

  composeUp ({ env, logger }) {
    const { workDir, files, detach, name } = this.stage;

    const params = ['--no-ansi'];
    for (const i in files) {
      params.push('-f', files[i]);
    }
    params.push('-f', `${OVERRIDE_SUFFIX}${name}.yml`);

    params.push('up', '--no-color');

    if (detach) {
      params.push('-d');
    } else {
      params.push('--abort-on-container-exit');
    }

    return spawn(OPTS.bin, params, { cwd: workDir, env, logger });
  }

  composeDown ({ env, logger }) {
    const { workDir, files, name } = this.stage;

    const params = ['--no-ansi'];
    for (const i in files) {
      params.push('-f', files[i]);
    }
    params.push('-f', `${OVERRIDE_SUFFIX}${name}.yml`);

    params.push('down', '--rmi', 'local');
    return spawn(OPTS.bin, params, { cwd: workDir, env, logger });
  }
}

module.exports = ComposeAdapter;
module.exports.OPTS = ComposeAdapter.OPTS;
