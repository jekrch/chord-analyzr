FROM golang:1.26-alpine AS build

WORKDIR /src

# cache module downloads separately from source changes
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

# the binary is static and waits for the database itself (no psql needed),
# so a minimal distroless base is enough
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/api /api

EXPOSE 8080

ENTRYPOINT ["/api"]
