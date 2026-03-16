#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="lt-bench"
IMAGE_NAME="litetrace"
CPUS="${CPUS:-1}"
MEMORY="${MEMORY:-2g}"
PORT="${PORT:-4318}"
TARGET="http://localhost:${PORT}/v1/traces"

cleanup() {
  if docker ps -q --filter "name=${CONTAINER_NAME}" | grep -q .; then
    echo "Stopping container..."
    docker stop "${CONTAINER_NAME}" >/dev/null
  fi
  if docker ps -aq --filter "name=${CONTAINER_NAME}" | grep -q .; then
    docker rm "${CONTAINER_NAME}" >/dev/null
  fi
}
trap cleanup EXIT

echo "Building image..."
docker build -t "${IMAGE_NAME}" .

cleanup

echo "Starting container (${CPUS} CPU / ${MEMORY} RAM)..."
docker run -d --name "${CONTAINER_NAME}" \
  --cpus="${CPUS}" \
  --memory="${MEMORY}" \
  -p "${PORT}:4318" \
  "${IMAGE_NAME}"

echo "Waiting for server..."
for i in $(seq 1 15); do
  if curl -sf -o /dev/null -w "" -X POST \
      -H "content-type: application/json" \
      -d '{}' \
      "${TARGET}" 2>/dev/null; then
    break
  fi
  sleep 1
done

echo
BENCH_TARGET="${TARGET}" bun scripts/bench.ts

echo
echo "Container stats at end of run:"
docker stats --no-stream "${CONTAINER_NAME}"
