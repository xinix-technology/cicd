class Adapter {
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

module.exports = { Adapter };
