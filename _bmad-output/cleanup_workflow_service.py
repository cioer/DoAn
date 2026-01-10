#!/usr/bin/env python3
"""
Script to cleanup workflow.service.ts by removing old implementations
and renaming *New methods to original names.
"""

import re
import sys
from pathlib import Path

def cleanup_workflow_service(file_path: Path):
    """Remove old implementations and rename *New methods"""

    print(f"Reading file: {file_path}")
    content = file_path.read_text(encoding='utf-8')
    lines = content.split('\n')

    print(f"Total lines: {len(lines)}")

    # Methods to process
    methods = [
        'submitProposal',
        'approveFacultyReview',
        'approveCouncilReview',
        'acceptSchoolReview',
        'returnFacultyReview',
        'returnSchoolReview',
        'returnCouncilReview',
        'resubmitProposal',
        'cancelProposal',
        'withdrawProposal',
        'rejectProposal',
        'pauseProposal',
        'resumeProposal',
    ]

    # Step 1: Remove feature flag property
    print("\n=== Step 1: Removing feature flag property ===")

    # Find and remove lines 83-84 (useNewServices property)
    new_lines = []
    skip_next = False
    for i, line in enumerate(lines):
        line_num = i + 1

        # Skip useNewServices property
        if 'private readonly useNewServices' in line:
            print(f"  Line {line_num}: Removing useNewServices property")
            continue

        # Skip the comment above it
        if 'Phase 1 Refactor: Feature flag' in line or 'Set to true in .env: WORKFLOW_USE_NEW_SERVICES' in line:
            print(f"  Line {line_num}: Removing feature flag comment")
            continue

        new_lines.append(line)

    lines = new_lines

    # Step 2: Process each method
    print("\n=== Step 2: Processing methods ===")

    for method_name in methods:
        print(f"\n  Processing: {method_name}")

        # Find the old method pattern
        # Pattern 1: async methodName(...) { if (this.useNewServices) ... }
        # We need to find where the old method ends and remove it

        # This is complex - we'll use a different approach
        # Find method definition and remove the if (this.useNewServices) block

    # For now, just save with feature flag removed
    output_path = Path('/mnt/dulieu/DoAn/qlnckh/apps/src/modules/workflow/workflow.service.cleaned.ts')
    output_path.write_text('\n'.join(lines), encoding='utf-8')

    print(f"\n=== Summary ===")
    print(f"Original lines: {len(content.split(chr(10)))}")
    print(f"Cleaned lines: {len(lines)}")
    print(f"Removed: {len(content.split(chr(10))) - len(lines)} lines")
    print(f"\nOutput saved to: {output_path}")
    print("\n⚠️  MANUAL STEPS STILL REQUIRED:")
    print("  1. Review the cleaned file")
    print("  2. Remove old method implementations")
    print("  3. Rename *New methods to original names")
    print("  4. Test thoroughly")

if __name__ == '__main__':
    file_path = Path('/mnt/dulieu/DoAn/qlnckh/apps/src/modules/workflow/workflow.service.ts')

    if not file_path.exists():
        print(f"Error: File not found: {file_path}")
        sys.exit(1)

    try:
        cleanup_workflow_service(file_path)
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
