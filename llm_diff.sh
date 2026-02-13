#!/bin/bash
(
  # 1. Regular changes to tracked files
  git diff
  
  # 2. Untracked files formatted as diffs
  echo ""
  echo "# Untracked files (new):"
  git ls-files --others --exclude-standard -z | while IFS= read -r -d '' file; do
    if [[ -f "$file" ]]; then
      hash=$(git hash-object "$file" | cut -c1-7)
      lines=$(wc -l < "$file" | tr -d ' ')
      echo "diff --git a/$file b/$file"
      echo "new file mode 100644"
      echo "index 0000000..$hash"
      echo "--- /dev/null"
      echo "+++ b/$file"
      echo "@@ -0,0 +1,$lines @@"
      sed 's/^/+/' "$file"
      echo ""
    fi
  done
) > ~/Downloads/temp_diff.txt