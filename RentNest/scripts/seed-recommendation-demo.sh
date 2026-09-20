#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" == Darwin ]]; then
  export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
fi
classpath_file="$(mktemp -t homegowhere-classpath)"
trap 'rm -f "$classpath_file"' EXIT
mvn -q -ntp dependency:build-classpath "-Dmdep.outputFile=$classpath_file"
"${JAVA_HOME:+$JAVA_HOME/bin/}java" --class-path "$(cat "$classpath_file")" scripts/SeedRecommendationDemo.java "${1:---preview}"
