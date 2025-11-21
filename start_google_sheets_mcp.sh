#!/bin/bash
export SERVICE_ACCOUNT_PATH="/Users/soderstrom/2025/October/go-happy-cab-demo/service_account.json"
export DRIVE_FOLDER_ID="0AIFH-AbD3bQ2Uk9PVA"
# Use absolute path to uvx to avoid PATH issues in IDE
/Users/soderstrom/.cargo/bin/uvx mcp-google-sheets
