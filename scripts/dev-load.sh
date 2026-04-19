#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

TMPFILE=$(mktemp /tmp/arbour-XXXXXX.tar)
STARTED=0

cleanup() {
    trap - EXIT SIGINT SIGTERM
    rm -f "$TMPFILE"
    if [[ "$STARTED" -eq 1 ]]; then
        echo ""
        echo "Stopping Arbour..."
        ARBOUR_IMAGE=arbour:dev docker compose down 2>/dev/null || true
    fi
}
trap cleanup EXIT SIGINT SIGTERM

echo "Building image from local source (this may take a few minutes)..."
dagger call build-image --source=. as-tarball export --path="$TMPFILE"

echo "Loading into Docker..."
LOAD_OUTPUT=$(docker load -i "$TMPFILE")
echo "$LOAD_OUTPUT"

IMAGE_ID=$(echo "$LOAD_OUTPUT" | grep -oE 'sha256:[a-f0-9]+' | head -1)

if [[ -z "$IMAGE_ID" ]]; then
    echo "Error: could not determine loaded image ID from: $LOAD_OUTPUT" >&2
    exit 1
fi

docker tag "$IMAGE_ID" arbour:dev
echo "Tagged $IMAGE_ID as arbour:dev"

echo ""
echo "Starting Arbour — press Ctrl+C to stop and remove..."
echo ""

STARTED=1
ARBOUR_IMAGE=arbour:dev docker compose up
