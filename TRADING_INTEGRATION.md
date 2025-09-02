# InvestAI 富途交易集成文档

## 概述

基于富途牛牛开放平台实现的智能交易系统，提供完整的股票交易执行能力。

## 核心特性

### ✅ 完整交易功能
- **多市场支持**: 港股、美股、A股、期货、新加坡、日本市场
- **多种订单类型**: 市价单、限价单、止损单、止损限价单
- **实时监控**: 持仓监控、订单状态跟踪、账户资金管理
- **风险管理**: 仓位控制、止损止盈、交易频率限制

### ✅ 策略框架
- **策略基类**: 提供完整的策略开发框架
- **事件驱动**: 支持逐笔行情、K线、订单状态等回调
- **风险控制**: 内置风险检查机制
- **自动化交易**: 从信号生成到执行的全自动化

### ✅ 官方最佳实践
- **遵循富途API规范**: 参数顺序、错误处理、连接管理
- **模拟官方SDK**: 提供类似的API接口设计
- **生产就绪**: 完整的配置管理和日志监控

## 快速开始

### 1. 环境准备

```bash
# 安装依赖
pip install -r requirements-trading.txt

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件配置相关参数
```

### 2. 基本使用

```python
from futu_trading_optimized import FutuTradingContext, TrdSide, OrderType, TrdEnv

async def basic_trading():
    # 创建交易上下文
    trd_ctx = FutuTradingContext()
    
    # 连接富途OpenD
    if await trd_ctx.open():
        # 解锁交易
        await trd_ctx.unlock_trade("your_password")
        
        # 下单示例
        response = await trd_ctx.place_order(
            price=320.0,
            qty=100,
            code="HK.00700",
            trd_side=TrdSide.BUY,
            order_type=OrderType.LIMIT,
            trd_env=TrdEnv.SIMULATE,
            remark="测试订单"
        )
        
        if response.success:
            print(f"下单成功，订单ID: {response.order_id}")
        
        # 关闭连接
        await trd_ctx.close()

# 运行
import asyncio
asyncio.run(basic_trading())
```

### 3. 策略开发

```python
from futu_trading_optimized import StrategyBase, MovingAverageStrategy

class MyCustomStrategy(StrategyBase):
    """自定义策略示例"""
    
    async def on_bar(self, bar_data):
        """K线回调"""
        code = bar_data['code']
        close_price = bar_data['close']
        
        # 你的交易逻辑
        if self._should_buy(code, close_price):
            await self.place_strategy_order(
                code=code,
                price=close_price,
                qty=100,
                trd_side=TrdSide.BUY,
                remark="自定义买入信号"
            )
```

## 核心组件

### 1. FutuTradingContext

交易上下文，负责与富途OpenD的通信：

```python
# 主要方法
trd_ctx.open()              # 打开连接
trd_ctx.close()             # 关闭连接
trd_ctx.unlock_trade()      # 解锁交易
trd_ctx.place_order()       # 下单
trd_ctx.get_acc_info()      # 获取账户信息
trd_ctx.position_list()     # 获取持仓列表
trd_ctx.order_list()        # 获取订单列表
```

### 2. StrategyBase

策略基类，提供完整的策略开发框架：

```python
# 主要回调方法
async def on_init(self)          # 策略初始化
async def on_tick(self, data)    # 逐笔行情回调  
async def on_bar(self, data)     # K线回调
async def on_order_status(self, data)  # 订单状态回调
async def on_fill(self, data)    # 成交回调

# 交易方法
async def place_strategy_order()  # 带风险控制的策略下单
```

### 3. 内置策略

#### MovingAverageStrategy (双均线策略)
- 快慢均线金叉死叉信号
- 自动仓位管理
- 风险控制检查

## 配置管理

### 环境变量配置

通过 `.env` 文件配置：

```ini
# 连接配置
FUTU_HOST=127.0.0.1
FUTU_PORT=11111

# 交易环境  
FUTU_ENVIRONMENT=SIMULATE

# 风险控制
RISK_MAX_POSITION_PERCENT=0.2
RISK_MAX_TRADE_AMOUNT=50000

# 策略参数
STRATEGY_FAST_MA=5
STRATEGY_SLOW_MA=20
```

### 代码配置

```python
from config.futu_optimized_config import create_default_config

# 获取配置
config = create_default_config()

# 生产环境配置
prod_config = create_production_config()
```

## 风险管理

### 仓位控制
- 单股票最大持仓比例限制
- 单笔交易最大金额限制
- 最小交易单位检查

### 交易时间控制
- 交易时间段限制
- 节假日交易限制
- 非交易时间拒绝下单

### 资金管理
- 购买力检查
- 可用资金检查
- 持仓数量验证

## 错误处理

### 错误码映射

```python
ERROR_CODE_MAP = {
    1001: "无效的API密钥",
    1002: "交易权限不足", 
    2001: "无效的股票代码",
    # ... 更多错误码
}
```

### 异常处理

```python
try:
    response = await trd_ctx.place_order(...)
    if not response.success:
        error_msg = ERROR_CODE_MAP.get(response.error_code, "未知错误")
        logger.error(f"下单失败: {error_msg}")
except Exception as e:
    logger.error(f"交易异常: {e}")
```

## 监控日志

### 日志配置

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    filename='logs/trading.log'
)
```

### 监控指标

- 连接状态监控
- 订单执行成功率
- 平均成交时间
- 资金使用率
- 策略收益率

## 部署说明

### 开发环境

```bash
# 使用模拟交易
FUTU_ENVIRONMENT=SIMULATE

# 运行策略演示
python futu_trading_optimized.py
```

### 生产环境

```bash
# 使用真实交易
FUTU_ENVIRONMENT=REAL

# 配置API密钥
FUTU_API_KEY=your_production_key
FUTU_API_SECRET=your_production_secret

# 严格的风险控制
RISK_MAX_POSITION_PERCENT=0.15
RISK_MAX_TRADE_AMOUNT=30000
```

### Docker部署

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements-trading.txt .
RUN pip install -r requirements-trading.txt

COPY . .

CMD ["python", "futu_trading_optimized.py"]
```

## 最佳实践

### 1. 连接管理

```python
# 使用上下文管理器确保连接关闭
async with FutuTradingContext() as trd_ctx:
    if await trd_ctx.open():
        # 执行交易操作
        pass
```

### 2. 错误重试

```python
# 实现重试机制
for attempt in range(config.connection.retry_attempts):
    try:
        response = await trd_ctx.place_order(...)
        if response.success:
            break
    except Exception as e:
        if attempt == config.connection.retry_attempts - 1:
            raise e
        await asyncio.sleep(1)
```

### 3. 性能优化

```python
# 批量操作减少API调用
async def batch_operations():
    # 批量获取数据
    account_info, positions = await asyncio.gather(
        trd_ctx.get_acc_info(),
        trd_ctx.position_list()
    )
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查OpenD是否运行
   - 验证主机端口配置

2. **下单失败**
   - 检查交易时间
   - 验证资金是否充足
   - 检查股票代码格式

3. **权限错误**
   - 确认交易账户已解锁
   - 检查API密钥权限

### 调试模式

```bash
# 启用详细日志
LOG_LEVEL=DEBUG

# 调试连接
FUTU_DEBUG=true
```

## 版本历史

- **v1.0.0** (2024-01-15)
  - 初始版本发布
  - 支持基本交易功能
  - 实现双均线策略
  - 完整的风险控制

## 支持与反馈

如有问题请提交 Issue 或联系开发团队。