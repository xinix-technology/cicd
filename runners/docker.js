
const { Docker } = require('../docker');

class DockerRunner {
  static test (stage) {
    return Boolean(stage.docker_file);
  }

  constructor (cicd, stage) {
    this.cicd = cicd;
    this.stage = stage;
  }

  async run ({ env }) {
    let { name, workDir } = this.cicd;
    let { name: stageName, docker_file: file } = this.stage;

    let docker = new Docker({ workDir, file, env, name: `${name}_cicddocker` });
    docker.on('log', log => this.cicd.log(log));

    try {
      this.cicd.log({ topic: 'head', message: `Building image ${name}:${stageName} ...` });

      await docker.build();

      this.cicd.log({ topic: 'head', message: `Running ${name}:${stageName} ...` });

      await docker.run();
    } finally {
      docker.removeAllListeners('log');

      await docker.rm();
      await docker.rmi();
    }
  }

  async abort ({ env }) {
    let { name, workDir } = this.cicd;
    let { name: stageName, docker_file: file } = this.stage;

    let docker = new Docker({ workDir, file, env, name: `${name}_cicddocker` });
    docker.on('log', log => this.cicd.log(log));

    try {
      this.cicd.log({ topic: 'head', message: `Aborting ${name}:${stageName} ...` });
      await docker.rm();
      await docker.rmi();
    } catch (err) {
      this.cicd.log({ topic: 'error', message: `Abort failed caused by: ${err}` });
    } finally {
      docker.removeAllListeners('log');
    }
  }
}

module.exports = DockerRunner;
