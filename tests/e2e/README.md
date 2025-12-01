# Essentia Audio Analysis E2E Tests

End-to-end tests for the Essentia audio analysis service running on Pow3r Workflow Orchestrator with Pow3r Pass authentication.

## Overview

These tests validate the complete audio analysis pipeline from file upload through analysis to result retrieval, ensuring:

- ✅ Pow3r Pass authentication works correctly
- ✅ ACL permissions are properly enforced
- ✅ Cloudflare Edge execution functions
- ✅ Workflow orchestration completes successfully
- ✅ Audio analysis produces expected results
- ✅ MCP server integration works
- ✅ Error handling and recovery functions

## Test Suites

### 1. Essentia Audio Analysis (`essentia-audio-analysis.spec.js`)
- Direct API testing of audio analysis endpoints
- ACL permission validation
- Low-level feature extraction verification
- Beat markers and loop slicing validation
- Song section detection testing
- Psychological descriptors analysis
- Songwriting metadata validation

### 2. Workflow Orchestrator (`workflow-orchestrator.spec.js`)
- Pow3r Workflow Orchestrator integration
- Workflow creation and execution
- Step-by-step progress monitoring
- Performance metrics validation
- Error handling and recovery testing

## Prerequisites

### Environment Variables

Set the following environment variables before running tests:

```bash
# Authentication
POW3R_PASS_TOKEN=your_pow3r_pass_token
POW3R_PASS_MASTER_TOKEN=your_master_token

# Service URLs
ESSENTIA_URL=https://essentia.yourdomain.workers.dev
WORKFLOW_URL=https://config.superbots.link/mcp/workflow
POW3R_PASS_URL=https://config.superbots.link/pass

# Optional Configuration
FRAME_SAMPLE_RATE=5
TEST_TIMEOUT=600000
```

### Dependencies

```bash
npm install
npx playwright install --with-deps
```

## Running Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test suites
npm run test:e2e:essentia    # Essentia audio analysis tests
npm run test:e2e:workflow    # Workflow orchestrator tests

# Run with browser UI
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed
```

### CI/CD Pipeline

The tests run automatically on:
- Push to `main` branch
- Pull requests to `main` branch
- Manual workflow dispatch

### Custom Deployment

Use the deployment script for full E2E testing:

```bash
# Deploy and test everything
./deploy-e2e.sh

# Test specific components
./deploy-e2e.sh essentia-only    # Essentia service only
./deploy-e2e.sh workflow-only    # Workflow orchestrator only
```

## Test Architecture

### Pow3r Pass ACL Matrix

Tests validate the following permission scopes:

| Scope | Description | Test Coverage |
|-------|-------------|---------------|
| `audio:analyze` | Analyze audio files | ✅ Full coverage |
| `metadata:read` | Read analysis results | ✅ Full coverage |
| `beats:extract` | Extract beat markers | ✅ Full coverage |
| `sections:detect` | Detect song sections | ✅ Full coverage |
| `psychology:analyze` | Psychological analysis | ✅ Full coverage |

### Workflow Execution

Tests cover the complete workflow:

1. **Authentication** - Pow3r Pass token validation
2. **Input Validation** - File URL and parameter checking
3. **Audio Download** - File retrieval and processing
4. **Feature Extraction** - Low-level audio features
5. **Beat Analysis** - Tempo and beat marker detection
6. **Section Detection** - Song structure analysis
7. **Loop Generation** - 4/8/16-beat loop creation
8. **Motif Analysis** - Musical pattern recognition
9. **Psychological Analysis** - Emotional descriptor extraction
10. **Result Compilation** - Final metadata assembly
11. **Storage** - Cloudflare R2 result persistence

### Error Scenarios

Tests include validation of:
- Invalid authentication tokens
- Insufficient permissions (ACL failures)
- Invalid file URLs
- Network timeouts
- Service unavailability
- Processing failures

## Test Data

### Audio Test File

The test suite uses `docs/No Its Not.mp3` (6.5 minutes, ~10MB) for comprehensive testing.

### Mock Data

For performance and reliability, tests use:
- Pre-defined audio feature vectors
- Mock API responses where appropriate
- Simulated network conditions
- Controlled test environments

## Performance Benchmarks

### Expected Execution Times

| Component | Expected Time | Notes |
|-----------|---------------|-------|
| Authentication | < 1s | Pow3r Pass validation |
| Audio Download | 5-30s | Depends on file size/location |
| Feature Extraction | 30-120s | CPU-intensive processing |
| Beat Analysis | 5-15s | Rhythm processing |
| Section Detection | 10-30s | Structural analysis |
| Metadata Generation | 15-45s | Psychological + motifs |
| Total Workflow | 2-5 minutes | End-to-end execution |

### Cloudflare Edge Validation

Tests verify:
- ✅ Edge execution (CF-RAY headers)
- ✅ Global distribution
- ✅ Sub-10s API response times
- ✅ 128MB memory limit compliance
- ✅ 30s CPU time limit compliance

## Debugging

### Common Issues

1. **Authentication Failures**
   ```bash
   # Check Pow3r Pass token
   curl -H "Authorization: Bearer $POW3R_PASS_TOKEN" $POW3R_PASS_URL/health
   ```

2. **Service Unavailability**
   ```bash
   # Check service health
   curl $ESSENTIA_URL/health
   curl $WORKFLOW_URL/health
   ```

3. **ACL Permission Issues**
   ```bash
   # Test specific scopes
   curl -H "Authorization: Bearer $POW3R_PASS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"fileUrl":"https://example.com/test.mp3"}' \
        $ESSENTIA_URL/analyze
   ```

### Debug Mode

Enable detailed logging:

```bash
DEBUG=true npm run test:e2e
```

## Results and Reports

### Test Outputs

- **HTML Report**: `playwright-report/index.html`
- **JSON Results**: `test-results/e2e-results.json`
- **JUnit XML**: `test-results/e2e-junit.xml`
- **Test Summary**: `test-results/test-summary-{runId}.json`

### CI/CD Integration

GitHub Actions automatically:
- Runs tests on push/PR
- Uploads test artifacts
- Generates deployment notifications
- Validates production readiness

## Security Validation

### Pow3r Pass Integration

Tests validate:
- ✅ JWT token validation
- ✅ Scope-based permissions
- ✅ Token expiration handling
- ✅ Invalid token rejection
- ✅ Master token capabilities

### ACL Enforcement

Tests verify:
- ✅ Required scope validation
- ✅ Permission inheritance
- ✅ Insufficient permission rejection
- ✅ Anonymous access blocking
- ✅ Admin override capabilities

## Contributing

### Adding New Tests

1. Create test file in `tests/e2e/`
2. Follow naming convention: `{component}.spec.js`
3. Include in Playwright configuration
4. Add to CI/CD pipeline if needed

### Test Best Practices

- Use descriptive test names
- Include ACL validation
- Test error scenarios
- Validate performance expectations
- Clean up test resources
- Document test requirements

---

## Quick Start

```bash
# 1. Set environment variables
export POW3R_PASS_TOKEN=your_token
export ESSENTIA_URL=https://essentia.yourdomain.workers.dev
export WORKFLOW_URL=https://config.superbots.link/mcp/workflow

# 2. Install dependencies
npm install && npx playwright install --with-deps

# 3. Run tests
npm run test:e2e

# 4. Check results
open playwright-report/index.html
```

**Success Criteria:**
- ✅ All tests pass
- ✅ Pow3r Pass authentication works
- ✅ ACL permissions enforced
- ✅ Cloudflare Edge execution confirmed
- ✅ Audio analysis pipeline complete
- ✅ Workflow orchestration successful




