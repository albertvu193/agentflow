#!/bin/bash
# AgentFlow Start Script - Run both frontend and backend
# Usage: bash start.sh

echo ""
echo "⚡ Starting AgentFlow..."
echo ""

# Check deps are installed
if [ ! -d "node_modules" ]; then
    echo "📦 First run detected — installing dependencies..."
    npm install
    echo ""
fi

# Start backend server
echo "🖥️  Starting backend server on port 3001..."
node server/server.js &
BACKEND_PID=$!

# Wait for backend to start
sleep 1

# Start frontend dev server
echo "🌐 Starting frontend on port 5173..."
npx vite --open &
FRONTEND_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚡ AgentFlow is running!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Trap Ctrl+C to kill both processes
trap "echo ''; echo 'Stopping AgentFlow...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

# Wait for either process to exit
wait
