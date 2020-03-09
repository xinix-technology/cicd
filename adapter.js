let CONFIG = {};

class Adapter {
  static reset (config) {
    CONFIG = {
      VHOST_PORT: '443',
      VHOST_UPSTREAM_PORT: '3000',
      DOCKER_BIN: 'docker',
      COMPOSE_BIN: 'docker-compose',
      ...config,
    };
  }

  static get CONFIG () {
    return CONFIG;
  }

  static test () {
    throw new Error('Adapter must implement .test()');
  }

  static validate () {
    throw new Error('Adapter must implement .validate()');
  }

  constructor (stage) {
    this.stage = stage;
  }

  get cannonicalName () {
    return `${this.stage.pipeline.name}_${this.stage.name}`;
  }

  get pipeline () {
    return this.stage.pipeline || {};
  }

  run () {
    throw new Error('Adapter must implement #run()');
  }

  abort () {
    throw new Error('Adapter must implement #abort()');
  }
}

Adapter.reset();

module.exports = { Adapter };
