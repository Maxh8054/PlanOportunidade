#!/bin/bash
cd /home/z/my-project
while true; do
  NODE_ENV=production bun .next/standalone/server.js &
  SERVER_PID=$!
  sleep 5
  # Keep pinging every 10s to keep process alive
  while kill -0 $SERVER_PID 2>/dev/null; do
    curl -sf http://localhost:3000/ > /dev/null 2>&1
    sleep 10
  done
  wait $SERVER_PID 2>/dev/null
done
