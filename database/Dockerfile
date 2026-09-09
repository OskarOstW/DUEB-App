FROM postgres:15-alpine@sha256:fe0737ba566a2c5b2a28f34433c0a423261900ec17b9bf7ad115e1aae7e57f1b
COPY runtime-apk.lock /tmp/runtime-apk.lock
RUN apk add --no-cache $(cat /tmp/runtime-apk.lock) \
    && rm /usr/local/bin/gosu /usr/local/bin/su-exec \
    && sed -i 's/exec gosu postgres/exec su-exec postgres/' /usr/local/bin/docker-entrypoint.sh \
    && su-exec postgres id
