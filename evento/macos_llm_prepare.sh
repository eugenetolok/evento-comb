#!/bin/bash

OUTPUT_FILE="project_context.txt"

# Clear or create the output file
echo "Preparing project context..." > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Helper function to include file content with a header
include_file() {
  local file="$1"
  echo "=== FILE: $file ===" >> "$OUTPUT_FILE"
  cat "$file" >> "$OUTPUT_FILE"
  echo -e "\n\n" >> "$OUTPUT_FILE"
}

# Exclude 'bin' directory and search for relevant source files
find . -type f \( \
  -name '*.go' -o \
  -name '*.js' -o \
  -name '*.jsx' -o \
  -name '*.ts' -o \
  -name '*.tsx' -o \
  -name '*.py' -o \
  -name '*.html' -o \
  -name '*.md' \
\) ! -path "./bin/*" | while read -r file; do
  include_file "$file"
done

echo "✅ Context preparation complete: $OUTPUT_FILE"
