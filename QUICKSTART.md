# InvestAI 快速开始指南

## 🚀 5分钟快速启动

### 1. 环境准备

确保已安装:
- Python 3.11+
- PostgreSQL 15+
- Redis 7+

### 2. 一键安装

```bash
# 克隆项目
git clone https://github.com/your-org/InvestAI.git
cd InvestAI

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
# 或
venv\\Scripts\\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 环境配置
cp .env.example .env
# 编辑 .env 文件设置数据库连接
```

### 3. 数据库设置

```bash
# 创建数据库
createdb investai

# 初始化表结构
python -c "
from app.services.database import engine
from app.models import Base
Base.metadata.create_all(bind=engine)
print('数据库初始化完成!')
"
```

### 4. 启动应用

```bash
# 开发模式启动
python run.py

# 或使用uvicorn直接启动
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 5. 验证安装

访问 http://localhost:8000 查看API文档

## 📋 基本使用流程

### 1. 用户注册

```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123",
    "full_name": "Test User"
  }'
```

### 2. 用户登录

```bash
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "password123"
  }'
```

保存返回的 `access_token`

### 3. 分析股票

```bash
curl -X POST "http://localhost:8000/analysis/stock" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "stock_code": "00700",
    "analysis_types": ["fundamental", "technical", "sentiment"]
  }'
```

### 4. 查看分析结果

使用上一步返回的 `task_id`:

```bash
curl -X GET "http://localhost:8000/analysis/stock/TASK_ID" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 🐳 Docker快速启动

### 1. 使用Docker Compose

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f app
```

### 2. 访问服务

- API服务: http://localhost:8000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- ClickHouse: localhost:8123
- RabbitMQ管理界面: http://localhost:15672

## 🔧 常见问题

### Q: 端口被占用怎么办？
A: 修改 `docker-compose.yml` 中的端口映射或停止占用端口的服务

### Q: 数据库连接失败？
A: 检查 `.env` 文件中的数据库配置是否正确

### Q: Redis连接失败？
A: 确保Redis服务正在运行，检查防火墙设置

### Q: 如何重置数据库？
A: 删除数据库并重新初始化:
```bash
dropdb investai
createdb investai
python -c "from app.services.database import engine; from app.models import Base; Base.metadata.create_all(bind=engine)"
```

## 📞 获取帮助

- 查看详细文档: [README.md](README.md)
- 提交问题: [GitHub Issues](https://github.com/your-org/InvestAI/issues)
- 社区支持: [Discord](https://discord.gg/investai)

---

💡 **提示**: 首次使用建议从Docker方式开始，最简单快捷！