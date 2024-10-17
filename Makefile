# Makefile for acs-schemas
# This is a POSIX Makefile. Please avoid gmake extensions.
# On Windows try https://frippery.org/busybox.

-include config.mk

git.tag!=git describe --tags --abbrev=0
git.sha!=git rev-parse --verify HEAD

version?=${git.tag}
registry?=ghcr.io/amrc-factoryplus
repo?=acs-schemas
suffix?=

tag=${version}${suffix}
image=${registry}/${repo}:${tag}

platform?=	linux/amd64

build_args+=	--build-arg revision="${git.tag} (${git.sha})"
build_args+=	--build-arg tag="${tag}"

.PHONY: all build pull run

all: build

build: git.prepare
	docker buildx build --push --platform "${platform}" -t "${image}" ${build_args} .

pull:
	docker pull "${image}"

run: pull
	docker run -ti --rm "${image}" /bin/sh

.PHONY: lint

build: lint

lint:
	cd deploy && node bin/lint.js

.PHONY: git.prepare git.check-committed git.pull amend

git.prepare:
	@:

ifndef git.allow_dirty
git.prepare: git.check-committed
endif

ifdef git.pull
git.prepare: git.pull
endif

git.check-committed:
	[ -z "$$(git status --porcelain)" ] || (git status; exit 1)

git.pull:
	git pull --ff-only

amend:
	git commit --amend -C HEAD -a

