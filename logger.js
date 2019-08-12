const { sprintf } = require('sprintf-js');

let instance;

class Logger {
  static getInstance () {
    if (!instance) {
      instance = new Logger();
    }

    return instance;
  }

  log ({ topic, message }) {
    if (topic === 'head') {
      console.info('');
      console.info(sprintf('---> %s', message));
      return;
    }

    if (topic === 'error') {
      console.error(sprintf('%5s | %s', topic.toUpperCase(), message));
    } else {
      console.info(sprintf('%5s | %s', topic.toUpperCase(), message));
    }

    // if (topic === 'head') {
    //   console.info('');
    // }
  }
}

module.exports = { Logger };
