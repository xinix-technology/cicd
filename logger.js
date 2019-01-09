const { sprintf } = require('sprintf-js');

class Logger {
  log ({ topic, message }) {
    if (topic === 'head') {
      console.info('');
    }

    if (topic === 'error') {
      console.error(sprintf('%5s | %s', topic.toUpperCase(), message));
    } else {
      console.info(sprintf('%5s | %s', topic.toUpperCase(), message));
    }

    if (topic === 'head') {
      console.info('');
    }
  }
}

module.exports = { Logger };
