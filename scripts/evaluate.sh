#!/usr/bin/env bash
# Run website evaluation against a target URL
#
# Usage:
#   ./scripts/evaluate.sh                                    # Uses default URL
#   ./scripts/evaluate.sh https://www.kmw-technology.de/hebammen
#   TARGET_URL=https://example.com ./scripts/evaluate.sh

set -euo pipefail

TARGET_URL="${1:-${TARGET_URL:-https://www.kmw-technology.de/hebammen}}"
OUTPUT_DIR="${OUTPUT_DIR:-./artifacts/evaluations}"

echo "🔭 Nightshift Website Evaluator"
echo "   Target: $TARGET_URL"
echo "   Output: $OUTPUT_DIR"
echo ""

mkdir -p "$OUTPUT_DIR"

TARGET_URL="$TARGET_URL" OUTPUT_DIR="$OUTPUT_DIR" \
  npx playwright test tests/evaluate-website.spec.ts \
  --project=chromium \
  --reporter=list

echo ""
echo "✅ Evaluation complete! Results saved to $OUTPUT_DIR/"
echo "   📄 evaluation.json       - Structured data"
echo "   📋 evaluation-report.txt - Human-readable report"
echo "   🖼️  *.png                - Screenshots"
