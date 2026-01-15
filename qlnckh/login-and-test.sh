#!/bin/bash

# ============================================================================
# Login and Test Workflow Script
#
# This script logs in with different test users and runs the workflow test
# ============================================================================

set -e

API_URL="${1:-http://localhost:4000/api}"

echo ""
echo "================================================================"
echo "          Workflow E2E Test - Auto Login"
echo "================================================================"
echo "API URL: $API_URL"
echo "================================================================"
echo ""

# Function to login and get token
login_and_get_token() {
  local email=$1
  local password=$2

  local response=$(curl -s -X POST "${API_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$password\"}")

  # Extract access token using grep/sed
  local token=$(echo "$response" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

  if [[ -z "$token" ]]; then
    echo "Error: Failed to login for $email"
    echo "Response: $response"
    return 1
  fi

  echo "$token"
}

# Login as different users
echo "Logging in as test users..."

# These are default demo credentials - adjust if needed
GIANG_VIEN_TOKEN=$(login_and_get_token "giangvien@demo.edu" "password123" || echo "")
QUAN_LY_KHOA_TOKEN=$(login_and_get_token "quanlykhoa@demo.edu" "password123" || echo "")
PHONG_KHCN_TOKEN=$(login_and_get_token "phongkhcn@demo.edu" "password123" || echo "")
BGH_TOKEN=$(login_and_get_token "bgh@demo.edu" "password123" || echo "")

# Check if all tokens were obtained
if [[ -z "$GIANG_VIEN_TOKEN" ]] || [[ -z "$QUAN_LY_KHOA_TOKEN" ]] || \
   [[ -z "$PHONG_KHCN_TOKEN" ]] || [[ -z "$BGH_TOKEN" ]]; then

  echo ""
  echo "================================================================"
  echo "WARNING: Some logins failed with default demo credentials."
  echo "================================================================"
  echo ""
  echo "You may need to:"
  echo "1. Check if the server is running at $API_URL"
  echo "2. Create test users in the database"
  echo "3. Update the credentials in this script"
  echo ""
  echo "To check available users, you can query the database:"
  echo "  docker exec -it <postgres-container> psql -U postgres -d qlnckh"
  echo "  SELECT id, email, role, display_name FROM users LIMIT 10;"
  echo ""

  # Try alternative: Ask user for credentials
  echo ""
  echo "Please enter credentials for testing:"
  echo ""

  read -p "GIANG_VIEN email: " giangvien_email
  read -sp "GIANG_VIEN password: " giangvien_pass
  echo ""
  GIANG_VIEN_TOKEN=$(login_and_get_token "$giangvien_email" "$giangvien_pass")

  read -p "QUAN_LY_KHOA email: " quanlykhoa_email
  read -sp "QUAN_LY_KHOA password: " quanlykhoa_pass
  echo ""
  QUAN_LY_KHOA_TOKEN=$(login_and_get_token "$quanlykhoa_email" "$quanlykhoa_pass")

  read -p "PHONG_KHCN email: " phongkhcn_email
  read -sp "PHONG_KHCN password: " phongkhcn_pass
  echo ""
  PHONG_KHCN_TOKEN=$(login_and_get_token "$phongkhcn_email" "$phongkhcn_pass")

  read -p "BGH email: " bgh_email
  read -sp "BGH password: " bgh_pass
  echo ""
  BGH_TOKEN=$(login_and_get_token "$bgh_email" "$bgh_pass")
fi

# Export tokens for the test script
export GIANG_VIEN_TOKEN
export QUAN_LY_KHOA_TOKEN
export PHONG_KHCN_TOKEN
export BGH_TOKEN
export API_URL

echo ""
echo "Tokens obtained successfully!"
echo ""

# Now run the workflow test
exec bash /mnt/dulieu/DoAn/qlnckh/test-workflow-e2e.sh "$API_URL"
