# InvestAI - AI驱动的智能股票投资分析平台

InvestAI是一个基于Agent架构的智能股票投资分析平台，为个人投资者提供AI驱动的投资决策支持。

## 🚀 功能特性

- **多维度AI分析**: 基本面、技术面、情感面全方位分析
- **智能投资建议**: 基于用户风险偏好的个性化策略推荐
- **实时市场监控**: 价格预警和事件触发通知
- **透明决策过程**: 完整的分析报告和投资逻辑解释
- **持续学习优化**: 基于市场变化和用户反馈不断改进

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户接口层                            │
│  Web App  │  Mobile App  │  API Gateway  │  Admin Panel │
├─────────────────────────────────────────────────────────┤
│                    业务逻辑层                            │
│  用户服务  │  Agent编排  │  策略引擎  │  通知服务        │
├─────────────────────────────────────────────────────────┤
│                   Agent执行层                           │
│ 数据Agent │ 分析Agent │ 策略Agent │ 监控Agent │ 执行Agent │
├─────────────────────────────────────────────────────────┤
│                    AI能力层                             │
│    LLM服务   │   向量检索   │   知识图谱   │   推理引擎    │
├─────────────────────────────────────────────────────────┤
│                    数据存储层                            │
│  PostgreSQL  │   Redis    │  ClickHouse  │  Vector DB  │
├─────────────────────────────────────────────────────────┤
│                    数据接入层                            │
│  股票数据API │ 财报数据  │  新闻数据  │  宏观经济数据     │
└─────────────────────────────────────────────────────────┘
```

## 📦 核心组件

### Agent架构

1. **DataCollectionAgent**: 多源数据收集和清洗
2. **FundamentalAnalysisAgent**: 基本面分析和财务指标计算
3. **TechnicalAnalysisAgent**: 技术指标分析和图表模式识别
4. **SentimentAnalysisAgent**: 新闻舆情和社交媒体情感分析
5. **StrategyGenerationAgent**: 投资策略生成和风险评估

### 技术栈

- **后端**: Python + FastAPI (异步高性能框架)
- **数据库**: PostgreSQL (关系型数据) + Redis (缓存)
- **时序数据库**: ClickHouse (高性能时序数据分析)
- **前端**: React + TypeScript + Ant Design
- **部署**: Docker + Kubernetes
- **监控**: Prometheus + Grafana + ELK

## 🛠️ 安装和运行

### 环境要求

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker 20.10+

### 快速开始

1. **克隆项目**
   ```bash
   git clone https://github.com/your-org/InvestAI.git
   cd InvestAI
   ```

2. **安装依赖**
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # 开发环境
   ```

3. **环境配置**
   ```bash
   cp .env.example .env
   # 编辑.env文件配置数据库和API密钥
   ```

4. **数据库初始化**
   ```bash
   # 创建数据库
   createdb investai
   
   # 运行迁移
   python -m app.services.database init
   ```

5. **启动应用**
   ```bash
   python run.py
   ```

### Docker部署

```bash
# 使用Docker Compose启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

## 📡 API文档

启动应用后访问: http://localhost:8000/docs

### 主要API端点

- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `GET /auth/profile` - 获取用户信息
- `POST /analysis/stock` - 分析单只股票
- `GET /analysis/stock/{task_id}` - 获取分析结果
- `GET /analysis/history` - 获取分析历史
- `GET /stocks/{code}/recommendations` - 获取股票推荐
- `GET /health` - 健康检查

## 🧪 测试

```bash
# 运行所有测试
pytest

# 运行单元测试
pytest tests/unit/

# 运行集成测试
pytest tests/integration/

# 生成测试覆盖率报告
pytest --cov=app tests/
```

## 📊 数据模型

### 核心数据表

- **users**: 用户信息和管理
- **stocks**: 股票基本信息
- **analysis_tasks**: 分析任务记录
- **stock_recommendations**: 股票推荐历史

### 时序数据

使用ClickHouse存储股价时序数据，支持高性能查询和分析。

## 🔧 开发指南

### 项目结构

```
InvestAI/
├── app/                    # 应用代码
│   ├── agents/            # Agent实现
│   ├── models/            # 数据模型
│   ├── services/          # 服务层
│   ├── main.py            # FastAPI应用
│   └── __init__.py        # 应用初始化
├── tests/                 # 测试代码
│   ├── unit/              # 单元测试
│   ├── integration/       # 集成测试
│   └── conftest.py        # 测试配置
├── requirements.txt       # 生产依赖
├── requirements-dev.txt   # 开发依赖
├── Dockerfile            # Docker配置
├── docker-compose.yml    # Docker编排
└── README.md             # 项目文档
```

### 添加新的Agent

1. 在 `app/agents/` 目录下创建新的Agent类
2. 继承 `BaseAgent` 基类
3. 实现 `execute` 方法
4. 在 `app/__init__.py` 中注册Agent
5. 添加相应的单元测试

### 代码规范

- 使用 `black` 进行代码格式化
- 使用 `isort` 进行import排序
- 使用 `flake8` 进行代码检查
- 使用 `mypy` 进行类型检查

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

- 📧 邮箱: support@investai.com
- 💬 社区: [Discord](https://discord.gg/investai)
- 🐛 问题: [GitHub Issues](https://github.com/your-org/InvestAI/issues)

## 🙏 致谢

- [FastAPI](https://fastapi.tiangolo.com/) - 高性能Web框架
- [SQLAlchemy](https://www.sqlalchemy.org/) - Python SQL工具包
- [Redis](https://redis.io/) - 内存数据结构存储
- [Docker](https://www.docker.com/) - 容器化平台

---

**投资有风险，入市需谨慎。本系统提供的分析仅供参考，不构成投资建议。**