FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    openjdk-17-jdk-headless \
    nodejs \
    npm \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /usr/sbin/nologin sandbox

WORKDIR /opt/code-runner

COPY runner.py /opt/code-runner/runner.py

RUN chmod 755 /opt/code-runner/runner.py

USER sandbox
