const debug = require('debug')('cicd:adapters:stack');
const spawn = require('../lib/spawn');
const yaml = require('js-yaml');
const path = require('path');
const fs = require('fs-extra');
const { Adapter } = require('../adapter');

class StackAdapter extends Adapter {
  static test ({ files }) {
    return !!files;
  }

  static validate ({ files = ['docker-compose.yml'] }) {
    return { detach: true, files };
  }

  async run ({ env, logger = () => undefined } = {}) {
    const { files, workDir } = this.stage;
    const name = `${this.stage.pipeline.name}`;
    const labels = {
      'id.sagara.cicd.pipeline': name,
      'id.sagara.cicd.stage': this.stage.name,
    };
    // const name = `${this.stage.pipeline.name}__${this.stage.name}`;

    logger({ level: 'head', message: 'Deploying ...' });

    const params = ['deploy'];

    for (const i in files) {
      const file = files[i];
      const content = await fs.readFile(path.join(workDir, file));
      const json = await yaml.load(content);
      for (const k in json.services) {
        const service = json.services[k];
        const serviceLabels = service.labels = service.labels || {};
        if (Array.isArray(serviceLabels)) {
          for (const k in labels) { // eslint-disable-line max-depth
            serviceLabels.push(`${k}=${labels[k]}`);
          }
        } else {
          Object.assign(serviceLabels, labels);
        }
      }
      const config = await yaml.dump(json);
      const cFile = `.${file}`;
      await fs.writeFile(path.join(workDir, cFile), config);
      params.push('-c', cFile);
    }

    params.push(name);
    await this.spawn(params, { logger, env, workDir });
  }

  async abort ({ env, logger = () => undefined } = {}) {
    const { workDir } = this.stage;
    const name = `${this.stage.pipeline.name}`;

    logger({ level: 'head', message: 'Removing ...' });
    await this.spawn(['rm', name], { logger, env, workDir });
  }

  spawn (params, { logger, env } = {}) {
    env = {
      PATH: process.env.PATH,
      ...env,
    };
    const opts = { cwd: this.workDir, env, logger };

    debug('Docker stack: %o', params);

    return spawn(Adapter.CONFIG.DOCKER_BIN, ['stack', ...params], opts);
  }
}

module.exports = StackAdapter;
