#!/bin/bash

# Script to remove old implementations and feature flag from workflow.service.ts
# This creates a clean version with only the new refactored code

set -e

BACKUP_BRANCH="backup-with-old-code"
FEATURE_FLAG="WORKFLOW_USE_NEW_SERVICES"
SERVICE_FILE="qlnckh/apps/src/modules/workflow/workflow.service.ts"
TEST_FILE="qlnckh/apps/src/modules/workflow/workflow.service.spec.ts"
PACKAGE_FILE="qlnckh/package.json"

echo "========================================="
echo "Phase 1 Code Cleanup Script"
echo "========================================="
echo ""

# Step 1: Verify we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Error: Must be on 'main' branch to run cleanup"
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

echo "✅ Step 1: Verified on 'main' branch"
echo ""

# Step 2: Check that backup branch exists
if ! git show-ref --verify --quiet refs/heads/$BACKUP_BRANCH; then
    echo "❌ Error: Backup branch '$BACKUP_BRANCH' not found"
    echo "Creating backup branch..."
    git branch $BACKUP_BRANCH
fi

echo "✅ Step 2: Backup branch '$BACKUP_BRANCH' exists"
echo ""

# Step 3: Remove feature flag from package.json
echo "Step 3: Removing feature flag from package.json..."
if grep -q "$FEATURE_FLAG" $PACKAGE_FILE; then
    # Create backup
    cp $PACKAGE_FILE ${PACKAGE_FILE}.backup

    # Remove the feature flag line
    sed -i "/$FEATURE_FLAG/d" $PACKAGE_FILE

    echo "✅ Feature flag removed from package.json"
else
    echo "⚠️  Feature flag not found in package.json (already removed?)"
fi
echo ""

# Step 4: Update WorkflowService constructor - remove feature flag parameter
echo "Step 4: Updating WorkflowService constructor..."
# This will be done manually or with a more sophisticated script
echo "⚠️  Manual update needed: Remove 'useNewServices' parameter from constructor"
echo ""

# Step 5: Remove old method implementations
echo "Step 5: Removing old method implementations..."
echo "⚠️  Manual update needed: Remove old implementations, keep only *New methods"
echo ""

# Step 6: Update tests - remove feature flag references
echo "Step 6: Updating test files..."
echo "⚠️  Manual update needed: Remove WORKFLOW_USE_NEW_SERVICES from tests"
echo ""

# Summary
echo "========================================="
echo "Cleanup Summary"
echo "========================================="
echo ""
echo "Manual steps required:"
echo ""
echo "1. Remove feature flag from workflow.service.ts:"
echo "   - Remove 'useNewServices' parameter from constructor"
echo "   - Remove 'if (this.useNewServices)' checks"
echo "   - Remove old implementations (keep only *New methods)"
echo "   - Rename *New methods to original names"
echo ""
echo "2. Remove feature flag from workflow.service.spec.ts:"
echo "   - Remove 'WORKFLOW_USE_NEW_SERVICES=true' prefix"
echo "   - Update tests to call original method names"
echo ""
echo "3. Remove feature flag from package.json:"
echo "   - Delete 'WORKFLOW_USE_NEW_SERVICES' environment variable"
echo ""
echo "4. Test the cleaned up code:"
echo "   - npm test -- workflow.service.spec.ts"
echo "   - Verify all tests pass"
echo ""
echo "5. Commit the cleanup:"
echo "   - git add ."
echo "   - git commit -m 'chore: remove old implementations and feature flag'"
echo ""
echo "========================================="
echo "Backup Information"
echo "========================================="
echo ""
echo "Backup branch: $BACKUP_BRANCH"
echo "To restore old code: git checkout $BACKUP_BRANCH"
echo ""
echo "========================================="
