#!/bin/bash
cd /home/z/my-project
echo "=== Starting at $(date) ===" > /home/z/my-project/dev.log
while true; do
  bun run dev >> /home/z/my-project/dev.log 2>&1 &
  BUN_PID=$!
  # Keep alive by pinging every 8 seconds
  for i in $(seq 1 100); do
    sleep 8
    if ! kill -0 $BUN_PID 2>/dev/null; then
      echo "=== Bun process died at $(date), restarting ===" >> /home/z/my-project/dev.log
      break
    fi
    curl -s -o /dev/null http://localhost:3000/ 2>/dev/null
  done
  kill $BUN_PID 2>/dev/null
  wait $BUN_PID 2>/dev/null
done
