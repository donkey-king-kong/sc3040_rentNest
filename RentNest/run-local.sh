#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ "$(uname -s)" == Darwin ]]; then
  export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
fi
if ! command -v mvn >/dev/null 2>&1; then
  echo 'Maven is required. On macOS: brew install maven' >&2
  exit 1
fi
exec mvn -B -ntp spring-boot:run '-Dspring-boot.run.arguments=--spring.jpa.hibernate.ddl-auto=validate'
