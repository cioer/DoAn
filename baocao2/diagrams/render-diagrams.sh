#!/bin/bash

##############################################################################
# Script: render-diagrams.sh
# Purpose: Render Mermaid diagrams (.mmd) to PNG and SVG formats
# Requirements: Node.js, @mermaid-js/mermaid-cli
##############################################################################

set -e  # Exit on error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
OUTPUT_DIR_PNG="$SCRIPT_DIR/png"
OUTPUT_DIR_SVG="$SCRIPT_DIR/svg"

echo "=================================================="
echo "   MERMAID DIAGRAM RENDERER"
echo "   Hệ thống qlNCKH - Báo cáo Đồ án Tốt nghiệp"
echo "=================================================="
echo ""

# Check if mmdc is installed
if ! command -v mmdc &> /dev/null; then
    echo "❌ ERROR: mermaid-cli (mmdc) is not installed."
    echo ""
    echo "To install, run:"
    echo "  npm install -g @mermaid-js/mermaid-cli"
    echo ""
    echo "Or using Docker:"
    echo "  docker pull minlag/mermaid-cli"
    echo ""
    exit 1
fi

echo "✓ mmdc command found: $(which mmdc)"
echo "✓ mmdc version: $(mmdc --version)"
echo ""

# Create output directories
mkdir -p "$OUTPUT_DIR_PNG"
mkdir -p "$OUTPUT_DIR_SVG"

echo "✓ Output directories created:"
echo "  - PNG: $OUTPUT_DIR_PNG"
echo "  - SVG: $OUTPUT_DIR_SVG"
echo ""

# Count .mmd files
MMD_COUNT=$(find "$SCRIPT_DIR" -maxdepth 1 -name "*.mmd" | wc -l)

if [ "$MMD_COUNT" -eq 0 ]; then
    echo "❌ No .mmd files found in $SCRIPT_DIR"
    exit 1
fi

echo "✓ Found $MMD_COUNT Mermaid diagram(s) to render"
echo ""
echo "=================================================="
echo ""

# Render each .mmd file
SUCCESS_COUNT=0
FAIL_COUNT=0

for mmd_file in "$SCRIPT_DIR"/*.mmd; do
    if [ -f "$mmd_file" ]; then
        filename=$(basename "$mmd_file" .mmd)

        echo "┌─────────────────────────────────────────────────"
        echo "│ Rendering: $filename"
        echo "└─────────────────────────────────────────────────"

        # Render to PNG (high quality, 2x scale)
        echo "  → PNG (2x scale, transparent background)..."
        if mmdc -i "$mmd_file" \
                -o "$OUTPUT_DIR_PNG/${filename}.png" \
                -t default \
                -b transparent \
                -s 2 \
                -w 2400 \
                --quiet 2>&1; then
            echo "    ✓ PNG saved: png/${filename}.png"
        else
            echo "    ✗ FAILED to render PNG"
            ((FAIL_COUNT++))
            continue
        fi

        # Render to SVG
        echo "  → SVG (vector format)..."
        if mmdc -i "$mmd_file" \
                -o "$OUTPUT_DIR_SVG/${filename}.svg" \
                -t default \
                -b transparent \
                --quiet 2>&1; then
            echo "    ✓ SVG saved: svg/${filename}.svg"
        else
            echo "    ✗ FAILED to render SVG"
            ((FAIL_COUNT++))
            continue
        fi

        ((SUCCESS_COUNT++))
        echo ""
    fi
done

echo "=================================================="
echo "   RENDER COMPLETE"
echo "=================================================="
echo ""
echo "Summary:"
echo "  ✓ Success: $SUCCESS_COUNT diagram(s)"
if [ "$FAIL_COUNT" -gt 0 ]; then
    echo "  ✗ Failed:  $FAIL_COUNT diagram(s)"
fi
echo ""
echo "Output locations:"
echo "  - PNG: $OUTPUT_DIR_PNG/"
echo "  - SVG: $OUTPUT_DIR_SVG/"
echo ""

# List generated files
echo "Generated PNG files:"
ls -lh "$OUTPUT_DIR_PNG" | grep -E "\.png$" | awk '{print "  - " $9 " (" $5 ")"}'
echo ""

echo "Generated SVG files:"
ls -lh "$OUTPUT_DIR_SVG" | grep -E "\.svg$" | awk '{print "  - " $9 " (" $5 ")"}'
echo ""

if [ "$FAIL_COUNT" -eq 0 ]; then
    echo "✅ All diagrams rendered successfully!"
    exit 0
else
    echo "⚠️  Some diagrams failed to render. Check errors above."
    exit 1
fi
