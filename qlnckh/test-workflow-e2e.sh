#!/bin/bash

# ============================================================================
# End-to-End Workflow Test Script
# Tests the complete proposal lifecycle from DRAFT to COMPLETED
#
# Usage: ./test-workflow-e2e.sh <API_URL> [OPTIONS]
# Options:
#   --skip-create       Skip proposal creation (use existing PROPOSAL_ID)
#   --proposal-id <id>  Use existing proposal ID
#   --dry-run           Show commands without executing
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;36m'
NC='\033[0m' # No Color

# Default values
API_URL="${1:-http://localhost:3000/api}"
SKIP_CREATE=false
PROPOSAL_ID=""
DRY_RUN=false

# Parse arguments
shift
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-create)
      SKIP_CREATE=true
      shift
      ;;
    --proposal-id)
      PROPOSAL_ID="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

log_warn() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

# API call function
api_call() {
  local method=$1
  local endpoint=$2
  local token=$3
  local data=$4

  local url="${API_URL}${endpoint}"
  local curl_cmd="curl -s -X ${method} '${url}'"

  if [[ -n "$token" ]]; then
    curl_cmd="${curl_cmd} -H 'Authorization: Bearer ${token}'"
  fi

  curl_cmd="${curl_cmd} -H 'Content-Type: application/json'"

  if [[ -n "$data" ]]; then
    curl_cmd="${curl_cmd} -d '${data}'"
  fi

  if [[ "$DRY_RUN" == true ]]; then
    echo -e "${YELLOW}$curl_cmd${NC}"
    return
  fi

  eval "$curl_cmd"
}

# Extract value from JSON response
extract_value() {
  local json=$1
  local key=$2
  echo "$json" | grep -o "\"$key\"[[:space:]]*:[[:space:]]*\"[^\"]*\"" | cut -d'"' -f4
}

# Check for success in response
check_success() {
  local response=$1
  local step_name=$2

  if echo "$response" | grep -q '"success":true'; then
    return 0
  else
    log_error "$step_name failed"
    echo "Response: $response"
    return 1
  fi
}

# ============================================================================
# WORKFLOW TEST
# ============================================================================

main() {
  echo ""
  echo "================================================================"
  echo "          End-to-End Workflow Test"
  echo "================================================================"
  echo "API URL: $API_URL"
  echo "Dry Run: $DRY_RUN"
  echo "================================================================"
  echo ""

  # You need to provide valid tokens for each role
  # For testing, you can get these by logging in as each user
  # or set them as environment variables
  GIANG_VIEN_TOKEN="${GIANG_VIEN_TOKEN:-}"
  QUAN_LY_KHOA_TOKEN="${QUAN_LY_KHOA_TOKEN:-}"
  PHONG_KHCN_TOKEN="${PHONG_KHCN_TOKEN:-}"
  BGH_TOKEN="${BGH_TOKEN:-}"

  if [[ -z "$GIANG_VIEN_TOKEN" ]] || [[ -z "$QUAN_LY_KHOA_TOKEN" ]] || \
     [[ -z "$PHONG_KHCN_TOKEN" ]] || [[ -z "$BGH_TOKEN" ]]; then
    log_error "Missing authentication tokens!"
    echo ""
    echo "Please set the following environment variables:"
    echo "  GIANG_VIEN_TOKEN     - JWT token for a GIANG_VIEN user"
    echo "  QUAN_LY_KHOA_TOKEN   - JWT token for a QUAN_LY_KHOA user"
    echo "  PHONG_KHCN_TOKEN     - JWT token for a PHONG_KHCN user"
    echo "  BGH_TOKEN            - JWT token for a BAN_GIAM_HOC user"
    echo ""
    echo "Example:"
    echo "  GIANG_VIEN_TOKEN='eyJhbGci...' QUAN_LY_KHOA_TOKEN='eyJhbGci...' \\"
    echo "  PHONG_KHCN_TOKEN='eyJhbGci...' BGH_TOKEN='eyJhbGci...' ./test-workflow-e2e.sh"
    echo ""
    exit 1
  fi

  # ========================================================================
  # Step 1: Create Proposal (DRAFT)
  # ========================================================================
  if [[ "$SKIP_CREATE" == false ]]; then
    log_info "Step 1: Creating proposal (DRAFT)..."

    local create_response=$(api_call \
      'POST' \
      '/proposals' \
      "$GIANG_VIEN_TOKEN" \
      '{
        "title": "E2E Test Proposal - '"$(date -Iseconds)"'",
        "facultyId": "'"$FACULTY_ID"'",
        "templateId": "'"$TEMPLATE_ID"'",
        "formData": {
          "summary": "End-to-end workflow test",
          "keywords": ["test", "e2e"]
        }
      }')

    if check_success "$create_response" "Proposal creation"; then
      PROPOSAL_ID=$(extract_value "$create_response" "id")
      local proposal_code=$(extract_value "$create_response" "code")
      log_success "Proposal created: $proposal_code (ID: $PROPOSAL_ID)"
    else
      exit 1
    fi
  else
    log_info "Using existing proposal: $PROPOSAL_ID"
  fi

  # ========================================================================
  # Step 2: Submit to Faculty (DRAFT → FACULTY_REVIEW)
  # ========================================================================
  log_info "Step 2: Submitting to faculty review..."

  local submit_response=$(api_call \
    'POST' \
    "/workflow/$PROPOSAL_ID/submit" \
    "$GIANG_VIEN_TOKEN" \
    '{}')

  if check_success "$submit_response" "Submit to faculty"; then
    local state=$(extract_value "$submit_response" "currentState")
    log_success "State transitioned to: $state"
  fi

  # ========================================================================
  # Step 3: Faculty Approves (FACULTY_REVIEW → SCHOOL_SELECTION_REVIEW)
  # ========================================================================
  log_info "Step 3: Faculty approves proposal..."

  local faculty_approve_response=$(api_call \
    'POST' \
    "/workflow/$PROPOSAL_ID/approve-faculty" \
    "$QUAN_LY_KHOA_TOKEN" \
    '{}')

  if check_success "$faculty_approve_response" "Faculty approve"; then
    local state=$(extract_value "$faculty_approve_response" "currentState")
    log_success "State transitioned to: $state"
  fi

  # ========================================================================
  # Step 4: School Assigns Council (SCHOOL_SELECTION_REVIEW → OUTLINE_COUNCIL_REVIEW)
  # ========================================================================
  log_info "Step 4: Assigning council..."

  # First get available councils
  local councils_response=$(api_call \
    'GET' \
    '/councils' \
    "$PHONG_KHCN_TOKEN" \
    '')

  local council_id=$(extract_value "$councils_response" "id")

  if [[ -z "$council_id" ]]; then
    log_warn "No council found, creating new one..."
    # Create council (this will need actual implementation)
    council_id="test-council-id"
  fi

  # Assign council to proposal
  local assign_response=$(api_call \
    'POST' \
    "/workflow/$PROPOSAL_ID/assign-council" \
    "$PHONG_KHCN_TOKEN" \
    '{"councilId": "'"$council_id"'"}')

  if check_success "$assign_response" "Council assignment"; then
    local state=$(extract_value "$assign_response" "currentState")
    log_success "State transitioned to: $state"
  else
    log_warn "Council assignment may need manual intervention"
  fi

  # ========================================================================
  # Step 5: BGH Approves Council Review (OUTLINE_COUNCIL_REVIEW → APPROVED)
  # ========================================================================
  log_info "Step 5: BGH approves council review..."

  local bgh_approve_response=$(api_call \
    'POST' \
    "/workflow/$PROPOSAL_ID/approve-council" \
    "$BGH_TOKEN" \
    '{}')

  if check_success "$bgh_approve_response" "BGH approve council"; then
    local state=$(extract_value "$bgh_approve_response" "currentState")
    log_success "State transitioned to: $state"
  fi

  # ========================================================================
  # Step 6: Start Project (APPROVED → IN_PROGRESS)
  # ========================================================================
  log_info "Step 6: Starting project implementation..."

  local start_response=$(api_call \
    'POST' \
    "/workflow/$PROPOSAL_ID/start-project" \
    "$GIANG_VIEN_TOKEN" \
    '{}')

  if check_success "$start_response" "Start project"; then
    local state=$(extract_value "$start_response" "currentState")
    log_success "State transitioned to: $state"
  fi

  # ========================================================================
  # Step 7: Submit for Acceptance (IN_PROGRESS → FACULTY_ACCEPTANCE_REVIEW)
  # ========================================================================
  log_info "Step 7: Submitting for faculty acceptance..."

  local acceptance_response=$(api_call \
    'POST' \
    "/workflow/$PROPOSAL_ID/submit-acceptance" \
    "$GIANG_VIEN_TOKEN" \
    '{}')

  if check_success "$acceptance_response" "Submit acceptance"; then
    local state=$(extract_value "$acceptance_response" "currentState")
    log_success "State transitioned to: $state"
  fi

  # ========================================================================
  # Step 8: Faculty Accepts (FACULTY_ACCEPTANCE_REVIEW → SCHOOL_ACCEPTANCE_REVIEW)
  # ========================================================================
  log_info "Step 8: Faculty accepts project..."

  local faculty_accept_response=$(api_call \
    'POST' \
    "/workflow/$PROPOSAL_ID/accept-faculty-acceptance" \
    "$QUAN_LY_KHOA_TOKEN" \
    '{}')

  if check_success "$faculty_accept_response" "Faculty accept"; then
    local state=$(extract_value "$faculty_accept_response" "currentState")
    log_success "State transitioned to: $state"
  fi

  # ========================================================================
  # Step 9: BGH Accepts School Review (SCHOOL_ACCEPTANCE_REVIEW → HANDOVER)
  # ========================================================================
  log_info "Step 9: BGH accepts school review..."

  local school_accept_response=$(api_call \
    'POST' \
    "/workflow/$PROPOSAL_ID/accept-school" \
    "$BGH_TOKEN" \
    '{}')

  if check_success "$school_accept_response" "School accept"; then
    local state=$(extract_value "$school_accept_response" "currentState")
    log_success "State transitioned to: $state"
  fi

  # ========================================================================
  # Step 10: Complete Handover (HANDOVER → COMPLETED)
  # ========================================================================
  log_info "Step 10: Completing handover..."

  local handover_response=$(api_call \
    'POST' \
    "/proposals/$PROPOSAL_ID/complete-handover" \
    "$GIANG_VIEN_TOKEN" \
    '{
      "checklist": [
        {"id": "item1", "checked": true, "note": "Documents submitted"},
        {"id": "item2", "checked": true, "note": "Data transferred"},
        {"id": "item3", "checked": true, "note": "Final report completed"}
      ]
    }')

  if check_success "$handover_response" "Complete handover"; then
    local state=$(extract_value "$handover_response" "currentState")
    log_success "State transitioned to: $state"
  fi

  # ========================================================================
  # Verify Workflow Logs
  # ========================================================================
  log_info "Verifying workflow logs..."

  local logs_response=$(api_call \
    'GET' \
    "/workflow/workflow-logs/$PROPOSAL_ID" \
    "$BGH_TOKEN" \
    '')

  local total_logs=$(echo "$logs_response" | grep -o '"total":[0-9]*' | cut -d':' -f2)

  log_success "Total workflow transitions logged: $total_logs"

  # ========================================================================
  # Summary
  # ========================================================================
  echo ""
  echo "================================================================"
  echo "                    TEST SUMMARY"
  echo "================================================================"
  echo "Proposal ID: $PROPOSAL_ID"
  echo "Total workflow logs: $total_logs"
  echo ""
  echo "Workflow States:"
  echo "  1. DRAFT"
  echo "  2. FACULTY_REVIEW"
  echo "  3. SCHOOL_SELECTION_REVIEW"
  echo "  4. OUTLINE_COUNCIL_REVIEW"
  echo "  5. APPROVED"
  echo "  6. IN_PROGRESS"
  echo "  7. FACULTY_ACCEPTANCE_REVIEW"
  echo "  8. SCHOOL_ACCEPTANCE_REVIEW"
  echo "  9. HANDOVER"
  echo "  10. COMPLETED"
  echo "================================================================"
  echo ""
  log_success "✨ End-to-End Workflow Test Complete!"
}

main "$@"
