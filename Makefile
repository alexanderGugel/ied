.PHONY: build test vet fmt

default: build

build:
	@go build -v

test:
	@go test -v

vet:
	@go vet -v

fmt:
	@./scripts/fmt
