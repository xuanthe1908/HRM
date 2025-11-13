#!/bin/bash
# Thư mục repo
APP_DIR="/e/TDC/TD Solutions/HRM"

# Log file
LOG_FILE="/e/TDC/TD Solutions/HRM/scripts/git-auto-pull.log"

echo "========== $(date) ==========" >> "$LOG_FILE"
cd "$APP_DIR" || exit

# Fetch và pull branch dev
git fetch origin main >> "$LOG_FILE" 2>&1
git reset --hard origin/main >> "$LOG_FILE" 2>&1

echo "Pull xong code branch dev lúc $(date)" >> "$LOG_FILE"


bash "/e/TDC/TD Solutions/HRM/scripts/auto-pull.sh"
