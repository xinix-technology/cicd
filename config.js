const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const fser = require('fser');

const LATEST_VERSION = '1';

class Config {
  constructor ({ workDir }) {
    this.workDir = workDir;
  }

  async load () {
    if (this.version) {
      return;
    }

    let files = [
      'cicd.yml',
      'cicd.yaml',
      'docker-compose.yml',
      'docker-compose.yaml',
      'Dockerfile',
    ];

    let availableFiles = await fser.readdir(fs, this.workDir);
    let configFile = files.find(f => availableFiles.includes(f));
    switch (configFile) {
      case 'cicd.yml':
      case 'cicd.yaml': {
        let { version, stages } = await this.loadYml(path.join(this.workDir, configFile));
        if (!version) {
          throw new Error('Configuration must have version');
        }

        for (let name in stages) {
          stages[name].name = name;
        }

        this.version = version;
        this.stages = stages;
        break;
      }
      case 'docker-compose.yml':
      case 'docker-compose.yaml':
        this.version = LATEST_VERSION;
        this.stages = {
          main: {
            name: 'main',
            detach: false,
            files: [ configFile ],
          },
        };
        break;
      case 'Dockerfile':
        this.version = LATEST_VERSION;
        this.stages = {
          main: {
            name: 'main',
            detach: false,
            docker_file: configFile,
          },
        };
        break;
      default:
        throw new Error('Configuration not found, nor executables');
    }
  }

  async loadYml (filepath) {
    let content = await new Promise((resolve, reject) => {
      try {
        fs.readFile(filepath, (err, content) => {
          if (err) {
            return reject(err);
          }

          resolve(content);
        });
      } catch (err) {
        reject(err);
      }
    });

    return yaml.safeLoad(content);
  }
}

module.exports = { Config };
