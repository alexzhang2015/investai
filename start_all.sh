#!/bin/bash
# 启动 InvestAI 完整服务 (后端 + 前端)

set -e

echo "🚀 Starting InvestAI Application..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查 uv 是否安装
if ! command -v uv &> /dev/null; then
    echo -e "${RED}❌ uv is not installed. Please install uv first.${NC}"
    exit 1
fi

# 检查 node 是否安装
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# 创建日志目录
mkdir -p logs

echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
uv sync

echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
cd frontend && npm install && cd ..

# 启动后端服务 (后台运行)
echo -e "${GREEN}🚀 Starting backend server...${NC}"
uv run python start_server.py > logs/backend.log 2>&1 &
BACKEND_PID=$!

# 等待后端启动
echo -e "${YELLOW}⏳ Waiting for backend to start...${NC}"
sleep 5

# 检查后端是否启动成功
if ! curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${YELLOW}⏳ Backend still starting, waiting more...${NC}"
    sleep 10
fi

# 启动前端服务 (后台运行)
echo -e "${GREEN}🚀 Starting frontend server...${NC}"
cd frontend && node start_frontend.js > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# 等待前端启动
echo -e "${YELLOW}⏳ Waiting for frontend to start...${NC}"
sleep 8

echo -e "${GREEN}✅ Services started successfully!${NC}"
echo -e "${BLUE}📊 Backend API: http://localhost:8000${NC}"
echo -e "${BLUE}🌐 Frontend UI: http://localhost:3001${NC}"
echo -e "${YELLOW}📝 Logs:${NC}"
echo -e "   Backend: logs/backend.log"
echo -e "   Frontend: logs/frontend.log"

# 清理函数
cleanup() {
    echo -e "\n${YELLOW}🛑 Stopping services...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null || true
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ Services stopped.${NC}"
    exit 0
}

# 捕获中断信号
trap cleanup SIGINT SIGTERM

# 保持脚本运行
echo -e "${GREEN}🎉 All services are running! Press Ctrl+C to stop.${NC}"
wait