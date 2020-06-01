FROM alpine

ARG FOO=stranger
ENV DOMAIN 127.0.0.1

RUN echo Hello $FOO

CMD ["sh", "-c", "ping \"${DOMAIN}\""]
