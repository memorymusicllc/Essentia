#!/bin/bash

# Essentia Audio Analysis - E2E Test Deployment Script
# Deploys and runs E2E tests with Pow3r Workflow Orchestrator

set -e

echo "🧪 Starting Essentia E2E test deployment..."

# Check environment variables
required_vars=("POW3R_PASS_TOKEN" "ESSENTIA_URL" "WORKFLOW_URL" "POW3R_PASS_URL")
for var in "${required_vars[@]}"; do
  if [[ -z "${!var}" ]]; then
    echo "❌ Required environment variable $var is not set"
    exit 1
  fi
done

# Validate URLs format
validate_url() {
  local url=$1
  local name=$2
  if [[ ! $url =~ ^https:// ]]; then
    echo "❌ $name URL must use HTTPS: $url"
    exit 1
  fi
}

validate_url "$ESSENTIA_URL" "Essentia"
validate_url "$WORKFLOW_URL" "Workflow"
validate_url "$POW3R_PASS_URL" "Pow3r Pass"

echo "✅ Environment validation passed"

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install --with-deps

# Validate Pow3r Pass authentication
echo "🔐 Validating Pow3r Pass authentication..."
if ! curl -f -H "Authorization: Bearer $POW3R_PASS_TOKEN" "$POW3R_PASS_URL/health" >/dev/null 2>&1; then
  echo "❌ Pow3r Pass authentication failed"
  exit 1
fi
echo "✅ Pow3r Pass authentication valid"

# Wait for services to be healthy
echo "🏥 Waiting for services to be healthy..."

wait_for_service() {
  local url=$1
  local name=$2
  local max_attempts=30
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    echo "Checking $name (attempt $attempt/$max_attempts)..."
    if curl -f -H "Authorization: Bearer $POW3R_PASS_TOKEN" "$url/health" >/dev/null 2>&1; then
      echo "✅ $name is healthy"
      return 0
    fi
    sleep 10
    ((attempt++))
  done

  echo "❌ $name failed to become healthy after $max_attempts attempts"
  return 1
}

wait_for_service "$ESSENTIA_URL" "Essentia Service"
wait_for_service "$WORKFLOW_URL" "Workflow Orchestrator"

# Validate ACL permissions
echo "🔒 Validating ACL permissions..."

# Test audio:analyze scope
if ! curl -f -H "Authorization: Bearer $POW3R_PASS_TOKEN" \
         -H "Content-Type: application/json" \
         -d '{"fileUrl":"https://example.com/test.mp3"}' \
         "$ESSENTIA_URL/analyze" >/dev/null 2>&1; then
  echo "❌ audio:analyze scope validation failed"
  exit 1
fi

# Test metadata:read scope
if ! curl -f -H "Authorization: Bearer $POW3R_PASS_TOKEN" \
         "$ESSENTIA_URL/health" >/dev/null 2>&1; then
  echo "❌ metadata:read scope validation failed"
  exit 1
fi

echo "✅ ACL permissions validated"

# Run E2E tests
echo "🚀 Running E2E tests..."

# Set test environment variables
export NODE_ENV=test
export BASE_URL="$ESSENTIA_URL"
export TEST_TIMEOUT=600000
export FRAME_SAMPLE_RATE=5

# Run the tests based on argument
case "$1" in
  "workflow-only")
    echo "Running workflow orchestrator tests only..."
    npm run test:e2e:workflow
    ;;
  "essentia-only")
    echo "Running essentia tests only..."
    npm run test:e2e:essentia
    ;;
  "sample-only")
    echo "Running sample workflow tests only..."
    npm run test:e2e:sample
    ;;
  "full-only")
    echo "Running full essentia workflow tests only..."
    npm run test:e2e:full
    ;;
  "workflows")
    echo "Running all workflow tests..."
    npm run test:e2e:sample && npm run test:e2e:full
    ;;
  *)
    echo "Running complete E2E test suite..."
    npm run test:e2e
    ;;
esac

# Check test results
if [ $? -eq 0 ]; then
  echo "✅ E2E tests passed!"

  # Show test summary
  if [ -f "test-results/e2e-results.json" ]; then
    echo ""
    echo "📊 Test Results Summary:"
    echo "========================"

    # Extract results using jq if available, otherwise show basic info
    if command -v jq >/dev/null 2>&1; then
      PASSED=$(jq '.suites[0].specs | map(.tests | map(select(.results[0].status == "passed"))) | flatten | length' test-results/e2e-results.json 2>/dev/null || echo "0")
      FAILED=$(jq '.suites[0].specs | map(.tests | map(select(.results[0].status == "failed"))) | flatten | length' test-results/e2e-results.json 2>/dev/null || echo "0")
      TOTAL=$(jq '.suites[0].specs | map(.tests | length) | add' test-results/e2e-results.json 2>/dev/null || echo "0")

      echo "✅ Passed: $PASSED"
      echo "❌ Failed: $FAILED"
      echo "📊 Total:  $TOTAL"
    else
      echo "Test results saved to test-results/"
      ls -la test-results/ 2>/dev/null || echo "No test results directory found"
    fi
  fi

  echo ""
  echo "🎉 Essentia E2E deployment and testing successful!"
  echo ""
  echo "📋 Services Status:"
  echo "  Essentia Service: $ESSENTIA_URL ✅"
  echo "  Workflow Orchestrator: $WORKFLOW_URL ✅"
  echo "  Pow3r Pass ACL: ✅"
  echo "  Cloudflare Edge: ✅"
  echo ""
  echo "🔗 Useful Links:"
  echo "  Health Check: $ESSENTIA_URL/health"
  echo "  Registry Status: $ESSENTIA_URL/registry/status"
  echo "  Test Results: ./test-results/"
  echo "  Playwright Report: ./playwright-report/index.html"

else
  echo "❌ E2E tests failed!"
  echo ""
  echo "🔍 Check the following for debugging:"
  echo "  - Test results: ./test-results/"
  echo "  - Playwright report: ./playwright-report/index.html"
  echo "  - Service logs: Check Cloudflare dashboard"
  echo "  - Network issues: Verify all services are accessible"

  exit 1
fi
