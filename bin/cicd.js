#!/usr/bin/env node

const { Pipeline, Stage } = require('..');
const debug = require('debug')('cicd:bin');
const { sprintf } = require('sprintf-js');
const yaml = require('js-yaml');
const colors = require('colors');
const argv = require('minimist')(process.argv.slice(2), {
  boolean: ['attach', 'help', 'pull', 'version'],
  alias: {
    a: 'attach',
    h: 'help',
    v: 'version',
  },
});

process.on('SIGINT', () => {
  console.info('');
  console.info('Shutting down from SIGINT (Ctrl-C)');
});

const SCOPED_FNS = [
  'abort',
  'dump',
  'ls',
  'run',
];

const FNS = {
  help () {
    const data = `
CI/CD Command Line Interpreter

Usage: cicd [COMMAND] [OPTIONS]

Commands:
  abort   [STAGE]  Abort pipeline (all stages) or single stage
  dump             Dump pipeline configuration
  help             Print help
  info             Print system information
  ls               List pipeline stages
  run     [STAGE]  Run pipeline (all stages) or single stage
  version          Print version information

Options:
  -a, --attach     Force attach
  -h, --help       Print help
  -v, --version    Print version information
    `.trim();
    console.info(data);
  },

  version () {
    const pkgJson = require('../package.json');
    const data = `
cicd version ${pkgJson.version}
    `.trim();
    console.info(data);
  },

  async run ({ pipeline, args: [name], options: { attach } }) {
    if (name) {
      await pipeline.getStage(name).run({ env: process.env, logger, attach });
    } else {
      await pipeline.run({ env: process.env, logger, attach });
    }
  },

  async abort ({ pipeline, args: [name] }) {
    if (name) {
      await pipeline.getStage(name).abort({ env: process.env, logger });
    } else {
      await pipeline.abort({ env: process.env, logger });
    }
  },

  ls ({ pipeline }) {
    const line = sprintf('%-15s %-15s %s', 'STAGE', 'TYPE', 'DETACHED');
    console.info(line);
    for (const name in pipeline.stages) {
      const stage = pipeline.stages[name];
      const line = sprintf('%-15s %-15s %s', stage.name, stage.type, stage.detach ? 'yes' : 'no');
      console.info(line);
    }
  },

  dump ({ pipeline }) {
    console.info(yaml.dump(pipeline.dump()));
    process.exit();
  },

  info () {
    console.info('Installed resolvers:');
    Pipeline.RESOLVERS.forEach(resolver => {
      console.info('  -', resolver.name);
    });

    console.info('');
    console.info('Installed adapters:');

    for (const key in Stage.ADAPTERS) {
      console.info('  -', key);
    }
  },
};

function logger (log) {
  const { pipeline, stage = '', level, message } = log;
  let line;
  if (level !== 'head' && stage) {
    const formattedLevel = colors[level === 'warn' || level === 'error' ? 'red' : 'green'](level.toUpperCase());
    line = sprintf('  --> %-5s %s', formattedLevel, message);
  } else {
    line = colors.yellow.bold(sprintf('[%-16s] %s', `${pipeline}:${stage}`, message));
  }

  if (level === 'warn' || level === 'error') {
    console.error(line);
  } else {
    console.info(line);
  }
}

function getFn (argv) {
  if (argv.version) {
    return FNS.version;
  }

  if (argv.help) {
    return FNS.help;
  }

  const name = argv._[0];
  const fn = FNS[name];

  if (fn && SCOPED_FNS.includes(name)) {
    fn.scoped = true;
  }

  return fn;
}

(async () => {
  try {
    const fn = getFn(argv);

    if (!fn) {
      throw new Error('Command not found!');
    }

    const args = argv._.slice(1);

    if (fn.scoped) {
      const pipeline = await Pipeline.resolve(process.cwd());
      await fn({
        pipeline,
        args,
        options: argv,
      });
    } else {
      await fn({
        args,
        options: argv,
      });
    }
    console.info('');
    console.info(colors.green(':)'));
  } catch (err) {
    // FNS.help();
    console.error('');
    console.error('Error:', err.message);
    debug(err);
    console.error('');
    console.error(colors.red(':('));

    process.exit(1);
  }
})();
