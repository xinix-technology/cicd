# Runner

Runner implements new way of running ci/cd task

## Implement new runner

Runner should implement this:

### static test()

TBD

### run({ env, logger })

TBD

### abort({ env, logger })

TBD

## Compose Runner

Running docker compose to build new image and run that image

```yml
files:
  - docker-compose.yml
detach: false
```

## Docker Runner

```yml
dockerfile: Dockerfile
detach: false
```
