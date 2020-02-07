# @xinix/cicd

Xinix CI/CD Library

CICD or Continuous Integration Continuous Deployment is an approach to do integration and deployment of application in scripting and automated way.

## Adapter

Adapter define how stage run.

Adapter must implement props:

- `.type`

Adapter must implement methods:

- `.test(config)`

Test configuration if match with adapter

- `.validate(config)`

Validate configuration and normalize configuration

- `#run({ env, logger })`

Run stage

- `#abort({ env, logger })`

Abort stage

## Resolver

Resolver detect configuration of a directory

