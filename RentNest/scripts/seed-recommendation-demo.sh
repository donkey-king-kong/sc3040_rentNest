#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" == Darwin ]]; then
  export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
fi
# An explicit template rather than `mktemp -t`, which needs the X's on GNU coreutils.
classpath_file="$(mktemp "${TMPDIR:-/tmp}/rentnest-classpath.XXXXXX")"
trap 'rm -f "$classpath_file"' EXIT
# Fall back to the wrapper so this works without a system-wide Maven install.
if command -v mvn >/dev/null 2>&1; then maven=mvn; else maven=./mvnw; fi
"$maven" -q -ntp dependency:build-classpath "-Dmdep.outputFile=$classpath_file"
"${JAVA_HOME:+$JAVA_HOME/bin/}java" --class-path "$(cat "$classpath_file")" scripts/SeedRecommendationDemo.java "${1:---preview}"
