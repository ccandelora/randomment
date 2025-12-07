#!/bin/bash
# Script to apply database migration using Supabase CLI
# Usage: ./scripts/apply-migration.sh [migration-file]

set -e

MIGRATION_FILE="${1:-migrations/COMPLETE-FIX.sql}"
PROJECT_REF="gqenovknwpnydyhbwtqw"

echo "🔧 Applying database migration: $MIGRATION_FILE"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "❌ Supabase CLI is not installed."
  echo "   Install it with: brew install supabase/tap/supabase"
  exit 1
fi

# Initialize Supabase project if needed
if [ ! -f "supabase/config.toml" ]; then
  echo "📦 Initializing Supabase project..."
  supabase init --force
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
  echo "⚠️  Not logged in to Supabase CLI."
  echo "   Please run: supabase login"
  echo "   This will open a browser for authentication."
  exit 1
fi

# Link to remote project
echo "📎 Linking to Supabase project: $PROJECT_REF"
# Check if already linked by looking at supabase config
if grep -q "project_id.*=.*\"$PROJECT_REF\"" supabase/config.toml 2>/dev/null; then
  echo "   Already linked to this project."
else
  echo "   Linking to project (press Enter if prompted for password)..."
  # Pipe empty input to skip password prompt (you can leave it blank)
  printf "\n" | supabase link --project-ref "$PROJECT_REF" 2>&1 | grep -v "^$" || {
    # If link fails, check if it actually succeeded (sometimes it shows warnings but succeeds)
    if grep -q "project_id.*=.*\"$PROJECT_REF\"" supabase/config.toml 2>/dev/null; then
      echo "   Link successful (despite warnings)."
    else
      echo "   ⚠️  Link may have failed. Continuing anyway..."
    fi
  }
fi

# Copy migration to supabase/migrations if it's not already there
MIGRATION_NAME=$(basename "$MIGRATION_FILE")
TIMESTAMP=$(date +%Y%m%d%H%M%S)
TARGET_MIGRATION="supabase/migrations/${TIMESTAMP}_$(echo $MIGRATION_NAME | sed 's/\.sql$//').sql"

if [ "$MIGRATION_FILE" != "$TARGET_MIGRATION" ]; then
  echo "📋 Copying migration to supabase/migrations..."
  cp "$MIGRATION_FILE" "$TARGET_MIGRATION"
fi

# Push migration to remote database
echo "🚀 Pushing migration to remote database..."
echo "   This may take a minute..."
echo ""
echo "   ⚠️  You may be prompted for your database password."
echo "   You can find it in: Supabase Dashboard → Project Settings → Database"
echo "   (You can also leave it blank if you don't have it - some projects don't require it)"
echo ""

if supabase db push; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ MIGRATION COMPLETED SUCCESSFULLY!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "📊 Verifying database state..."
  echo ""
  npm run db:inspect
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ All done! Your database is now fixed and ready to use."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "❌ MIGRATION FAILED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "Check the error messages above for details."
  echo "Common issues:"
  echo "  - Not logged in: Run 'supabase login' first"
  echo "  - Permission issues: Make sure you have access to the project"
  echo "  - SQL errors: Check the migration file for syntax errors"
  exit 1
fi
