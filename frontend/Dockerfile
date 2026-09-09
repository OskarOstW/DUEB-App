FROM golang:1.27-alpine@sha256:cf6fca6641884b8433441b2b0652976f975e1d0fdd26d177eaaf8596087f3125 AS proxy-build
WORKDIR /src
COPY caddy/go.mod caddy/go.sum ./
RUN go mod download
COPY caddy/main.go ./
RUN CGO_ENABLED=0 go build -mod=readonly -trimpath -ldflags="-s -w" -o /caddy .
RUN find /go/pkg/mod -type f \( -iname 'license*' -o -iname 'notice*' -o -iname 'copying*' \) \
    -exec sh -c 'for file do printf "\n===== %s =====\n" "$file"; cat "$file"; done' sh {} + > /caddy-licenses.txt \
    && cat /usr/local/go/LICENSE >> /caddy-licenses.txt

FROM node:24-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM caddy:2-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648
COPY runtime-apk.lock /tmp/runtime-apk.lock
RUN apk add --no-cache $(cat /tmp/runtime-apk.lock)
COPY --from=proxy-build /caddy /usr/bin/caddy
COPY --from=proxy-build /caddy-licenses.txt /usr/share/licenses/caddy/third-party.txt
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
HEALTHCHECK --interval=15s --timeout=5s --retries=4 CMD wget -q -O /dev/null http://127.0.0.1:8081/ready
