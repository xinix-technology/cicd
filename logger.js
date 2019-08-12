const { sprintf } = require('sprintf-js');
const colors = require('colors');

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
      console.info(colors.bold(sprintf('-----> %s', message)));
      return;
    }

    if (topic === 'error') {
      console.error(sprintf('%5s | %s', colors.red(topic.toUpperCase()), message));
    } else if (topic === 'warn') {
      console.info(sprintf('%5s | %s', colors.yellow(topic.toUpperCase()), message));
    } else {
      console.info(sprintf('%5s | %s', colors.green(topic.toUpperCase()), message));
    }

    // if (topic === 'head') {
    //   console.info('');
    // }
  }
}

module.exports = { Logger };
