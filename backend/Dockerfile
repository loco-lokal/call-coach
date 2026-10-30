FROM golang:1.26.5-bookworm AS dependencies
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
FROM dependencies AS source
COPY . .
FROM source AS tests
CMD ["sh", "-c", "go build -o /tmp/call-coach-mcp ./cmd/mcp && MCP_BINARY=/tmp/call-coach-mcp go test -race ./..."]
FROM source AS build
RUN --mount=type=cache,target=/root/.cache/go-build go test ./...
RUN --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api
RUN --mount=type=cache,target=/root/.cache/go-build set -eu; for target in darwin/amd64 darwin/arm64 linux/amd64 linux/arm64 windows/amd64; do os=${target%/*}; arch=${target#*/}; suffix=""; if [ "$os" = windows ]; then suffix=.exe; fi; GOOS=$os GOARCH=$arch CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/bin/call-coach-mcp-$os-$arch$suffix ./cmd/mcp; done
FROM gcr.io/distroless/static-debian12:nonroot AS runtime
WORKDIR /app
COPY --from=build --chown=65532:65532 /out/ ./
USER 65532:65532
EXPOSE 8080
ENTRYPOINT ["/app/api"]
