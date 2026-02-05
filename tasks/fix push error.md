# Task: Fix "GitHub Personal Access Token is not set" Error
# The release job is failing because GH_TOKEN is empty.

# Please update .github/workflows/release.yml with this EXACT configuration:

name: Build and Release
on:
  push:
    branches:
      - main

jobs:
  release:
    runs-on: windows-latest
    permissions:
      contents: write # CRITICAL: Gives the token permission to upload releases
    
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm install

      - name: Build and Publish
        run: npm run publish-always
        env:
          # CRITICAL FIX: Map the auto-generated secret to the specific name electron-builder wants
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}