#!/bin/bash

# Stop CampusSync servers

echo "🛑 Stopping CampusSync servers..."

# Kill backend and frontend processes
pkill -f "tsx watch src/server.ts" || true
pkill -f "next dev" || true

echo "✅ Servers stopped"



