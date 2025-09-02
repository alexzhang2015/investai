#!/usr/bin/env python3
"""
使用 uv 启动 InvestAI 后端服务
"""
import subprocess
import sys
import os

def start_server():
    """启动服务端"""
    try:
        # 确保使用 uv 安装依赖
        print("🔄 Installing dependencies with uv...")
        subprocess.run(["uv", "sync"], check=True)
        
        # 使用 uv 运行服务器
        print("🚀 Starting InvestAI backend server with uv...")
        subprocess.run([
            "uv", "run", "uvicorn", 
            "app.main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload",
            "--log-level", "info"
        ], check=True)
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n✋ Server stopped by user")
        sys.exit(0)

if __name__ == "__main__":
    start_server()