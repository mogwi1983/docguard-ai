#!/bin/bash
# Deploy DocGuard AI to VPS
npm run build
pm2 stop docguard-ai 2>/dev/null || true
pm2 start npm --name docguard-ai -- start
pm2 save
