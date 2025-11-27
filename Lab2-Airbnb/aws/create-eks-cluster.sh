#!/usr/bin/env bash
set -euo pipefail

# Create EKS cluster using the eksctl config in this repo.
# Requires: aws CLI configured, eksctl installed.

CONFIG_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/eksctl-cluster.yaml"

if ! command -v eksctl >/dev/null 2>&1; then
  echo "eksctl not found. Install it first: https://eksctl.io/introduction/#installation" >&2
  exit 1
fi

echo "Creating EKS cluster with config: ${CONFIG_PATH}"
eksctl create cluster -f "${CONFIG_PATH}"
