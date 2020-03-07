FROM alpine

ARG FOO=stranger

RUN echo Hello $FOO

CMD ["sh", "-c", "ping \"${DOMAIN}\""]
