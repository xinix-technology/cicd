const spawn = require('../lib/spawn');
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs-extra');
const { Adapter } = require('../adapter');

const OVERRIDE_SUFFIX = '.cicd-override-';

const OPTS = {
  bin: 'docker',
};

class StackAdapter extends Adapter {
  static test ({ files }) {
    return !!files;
  }

  static validate ({ files = ['docker-stack.yml'] }) {
    return { detach: true, files };
  }

  async run ({ env, labels, networks, logger }) {
    const { files, workDir } = this.stage;
    const name = `${this.stage.pipeline.name}`;

    await this.prepareOverrideFile({ labels, networks });

    logger({ level: 'head', message: 'Deploying ...' });

    const params = ['stack', 'deploy'];

    for (const i in files) {
      params.push('-c', files[i]);
    }
    params.push('-c', `${OVERRIDE_SUFFIX}${this.stage.name}.yml`);

    params.push(name);
    await spawn(OPTS.bin, params, { logger, env, cwd: workDir });
  }

  async abort ({ env, logger }) {
    const { workDir } = this.stage;
    const name = `${this.stage.pipeline.name}`;

    logger({ level: 'head', message: 'Removing ...' });

    const params = ['stack', 'rm', name];
    await spawn(OPTS.bin, params, { logger, env, cwd: workDir });
  }

  async prepareOverrideFile ({ labels, networks }) {
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
}

module.exports = StackAdapter;
module.exports.OPTS = OPTS;
