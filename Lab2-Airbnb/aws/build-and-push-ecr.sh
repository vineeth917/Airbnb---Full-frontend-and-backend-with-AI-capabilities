#!/usr/bin/env bash
set -euo pipefail

# Build and push Docker images for frontend, backend, and ai-service to ECR.
# Requires: aws CLI configured, docker installed.

REGION="${REGION:-$(aws configure get region 2>/dev/null || echo us-east-1)}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY="${ECR_REGISTRY:-${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com}"
TAG="${TAG:-latest}"
PLATFORM="${PLATFORM:-linux/amd64}"
BUILDX_BUILDER="${BUILDX_BUILDER:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

IMAGES=(
  "airbnb-backend backend"
  "airbnb-frontend frontend -f frontend/Dockerfile.nginx"
  "airbnb-ai-service ai-service"
)

for bin in aws docker; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing dependency: $bin" >&2
    exit 1
  fi
done

if ! docker buildx version >/dev/null 2>&1; then
  echo "docker buildx not available; install/enable Buildx (Docker Desktop has it by default)." >&2
  exit 1
fi

echo "Using registry: ${ECR_REGISTRY}"
echo "Using tag: ${TAG}"
echo "Using platform: ${PLATFORM}"

aws ecr get-login-password --region "$REGION" | docker login --username AWS --password-stdin "$ECR_REGISTRY"

# Ensure buildx builder exists
BUILDER_NAME="ecr-builder"
if ! docker buildx inspect "$BUILDER_NAME" >/dev/null 2>&1; then
  echo "Creating buildx builder: ${BUILDER_NAME}"
  docker buildx create --name "$BUILDER_NAME" --use --driver docker-container --platform linux/amd64,linux/arm64
fi

docker buildx use "$BUILDER_NAME"

for entry in "${IMAGES[@]}"; do
  # Parse the entry: repo and build args (e.g., "airbnb-frontend frontend -f frontend/Dockerfile.nginx")
  repo=$(echo "$entry" | awk '{print $1}')
  rest=$(echo "$entry" | awk '{$1=""; print substr($0,2)}')
  
  # Extract context directory (first argument after repo)
  context_relpath=$(echo "$rest" | awk '{print $1}')
  context_dir="${REPO_ROOT}/${context_relpath}"
  
  # Extract build args (everything after the context directory)
  build_args=$(echo "$rest" | awk '{$1=""; print substr($0,2)}')
  
  if [[ ! -d "$context_dir" ]]; then
    echo "Context not found for ${repo}: ${context_dir}" >&2
    exit 1
  fi

  if ! aws ecr describe-repositories --repository-names "$repo" --region "$REGION" >/dev/null 2>&1; then
    echo "Creating ECR repository: ${repo}"
    aws ecr create-repository --repository-name "$repo" --region "$REGION" >/dev/null
  fi

  image="${ECR_REGISTRY}/${repo}:${TAG}"
  echo "Building and pushing ${image} from ${context_dir}..."
  if [[ -n "$build_args" ]]; then
    echo "Build args: ${build_args}"
  fi
  
  # Build with buildx for AMD64 platform and push directly
  if [[ -n "$build_args" ]]; then
    docker buildx build \
      --platform "$PLATFORM" \
      --tag "$image" \
      --push \
      $build_args \
      "$context_dir"
  else
    docker buildx build \
      --platform "$PLATFORM" \
      --tag "$image" \
      --push \
      "$context_dir"
  fi
done

echo "Done. Images pushed to ${ECR_REGISTRY} with tag ${TAG}."
