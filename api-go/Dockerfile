FROM golang:1.26-alpine AS build

# which command to build: api (default) or mcp
ARG CMD=api

WORKDIR /src

# cache module downloads separately from source changes
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/app ./cmd/${CMD}

# the binary is static and waits for the database itself (no psql needed),
# so a minimal distroless base is enough
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/app /app

EXPOSE 8080

ENTRYPOINT ["/app"]
