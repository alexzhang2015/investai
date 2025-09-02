# 富途配置优化
# 基于官方文档最佳实践

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class TrdMarket(Enum):
    """交易市场（官方定义）"""
    HK = 1  # 港股
    US = 2  # 美股
    CN = 3  # A股
    FUTURES = 4  # 期货
    SG = 5  # 新加坡
    JP = 6  # 日本

class TrdEnv(Enum):
    """交易环境"""
    REAL = 0  # 真实环境
    SIMULATE = 1  # 模拟环境

class OrderType(Enum):
    """订单类型"""
    NORMAL = 0  # 普通单
    MARKET = 1  # 市价单
    LIMIT = 2   # 限价单
    STOP = 3    # 止损单
    STOP_LIMIT = 4  # 止损限价单

class SecurityType(Enum):
    """证券类型"""
    STOCK = 1  # 股票
    ETF = 2    # ETF
    WARRANT = 3  # 窝轮
    BOND = 4   # 债券
    INDEX = 5  # 指数
    FUTURES = 6  # 期货
    OPTION = 7  # 期权

@dataclass
class FutuConnectionConfig:
    """富途连接配置"""
    host: str = "127.0.0.1"
    port: int = 11111
    timeout: int = 30  # 超时时间(秒)
    retry_attempts: int = 3  # 重试次数
    
    # 从环境变量获取配置
    @classmethod
    def from_env(cls):
        return cls(
            host=os.getenv('FUTU_HOST', '127.0.0.1'),
            port=int(os.getenv('FUTU_PORT', '11111')),
            timeout=int(os.getenv('FUTU_TIMEOUT', '30')),
            retry_attempts=int(os.getenv('FUTU_RETRY_ATTEMPTS', '3'))
        )

@dataclass
class TradingRiskConfig:
    """交易风险配置"""
    # 仓位控制
    max_position_percent: float = 0.2  # 单股票最大持仓比例
    max_trade_amount: float = 50000.0  # 单笔交易最大金额
    
    # 止损止盈
    stop_loss_percent: float = 0.1  # 止损百分比
    take_profit_percent: float = 0.2  # 止盈百分比
    
    # 交易时间
    trading_start_time: str = "09:30:00"
    trading_end_time: str = "16:00:00"
    
    # 最小交易单位
    default_lot_size: int = 100  # 默认每手股数

@dataclass
class StrategyConfig:
    """策略配置"""
    # 双均线策略参数
    fast_ma_period: int = 5  # 快线周期
    slow_ma_period: int = 20  # 慢线周期
    
    # 交易参数
    investment_percent: float = 0.2  # 单次投资资金比例
    min_investment_amount: float = 10000.0  # 最小投资金额
    
    # 监控参数
    data_refresh_interval: int = 60  # 数据刷新间隔(秒)
    position_check_interval: int = 300  # 持仓检查间隔(秒)

@dataclass
class MarketConfig:
    """市场配置"""
    supported_markets: List[TrdMarket] = None
    default_market: TrdMarket = TrdMarket.HK
    
    # 市场交易时间配置
    market_hours: Dict[TrdMarket, Dict[str, str]] = None
    
    def __post_init__(self):
        if self.supported_markets is None:
            self.supported_markets = [TrdMarket.HK, TrdMarket.US]
        
        if self.market_hours is None:
            self.market_hours = {
                TrdMarket.HK: {"start": "09:30:00", "end": "16:00:00"},
                TrdMarket.US: {"start": "21:30:00", "end": "04:00:00"},
                TrdMarket.CN: {"start": "09:30:00", "end": "15:00:00"}
            }

@dataclass
class FutuGlobalConfig:
    """全局配置"""
    connection: FutuConnectionConfig
    risk: TradingRiskConfig
    strategy: StrategyConfig
    market: MarketConfig
    environment: TrdEnv = TrdEnv.SIMULATE
    
    # 策略标识
    strategy_name: str = "InvestAI_Strategy"
    strategy_version: str = "1.0.0"
    
    # 日志配置
    log_level: str = "INFO"
    log_file: str = "logs/futu_trading.log"

# 配置工厂函数
def create_default_config() -> FutuGlobalConfig:
    """创建默认配置"""
    return FutuGlobalConfig(
        connection=FutuConnectionConfig(),
        risk=TradingRiskConfig(),
        strategy=StrategyConfig(),
        market=MarketConfig(),
        environment=TrdEnv.SIMULATE
    )

def create_production_config() -> FutuGlobalConfig:
    """创建生产环境配置"""
    return FutuGlobalConfig(
        connection=FutuConnectionConfig.from_env(),
        risk=TradingRiskConfig(
            max_position_percent=0.15,
            max_trade_amount=30000.0,
            stop_loss_percent=0.08,
            take_profit_percent=0.15
        ),
        strategy=StrategyConfig(
            investment_percent=0.15,
            min_investment_amount=20000.0
        ),
        market=MarketConfig(),
        environment=TrdEnv.REAL,
        log_level="INFO",
        log_file="/var/log/investai/futu_trading.log"
    )

# 市场代码映射
MARKET_CODE_MAP = {
    "HK": TrdMarket.HK,
    "US": TrdMarket.US,
    "SH": TrdMarket.CN,
    "SZ": TrdMarket.CN,
    "CN": TrdMarket.CN,
    "SG": TrdMarket.SG,
    "JP": TrdMarket.JP
}

# 反向映射
MARKET_CODE_REVERSE_MAP = {v: k for k, v in MARKET_CODE_MAP.items()}

# 证券类型映射
SECURITY_TYPE_MAP = {
    "STOCK": SecurityType.STOCK,
    "ETF": SecurityType.ETF,
    "WARRANT": SecurityType.WARRANT,
    "BOND": SecurityType.BOND,
    "INDEX": SecurityType.INDEX,
    "FUTURES": SecurityType.FUTURES,
    "OPTION": SecurityType.OPTION
}

# 错误码映射（基于官方文档）
ERROR_CODE_MAP = {
    1001: "无效的API密钥",
    1002: "交易权限不足", 
    2001: "无效的股票代码",
    2002: "不支持的交易市场",
    2003: "无效的证券类型",
    3001: "下单数量错误",
    3002: "下单价格错误",
    3003: "价格超出涨跌幅限制",
    4001: "资金不足",
    4002: "持仓不足",
    4003: "超过最大可买数量",
    4004: "超过最大可卖数量",
    5001: "系统繁忙",
    5002: "网络超时",
    5003: "交易接口异常"
}

# 交易时间配置
TRADING_HOLIDAYS = {
    TrdMarket.HK: ["2024-01-01", "2024-02-10", "2024-02-11"],  # 香港假期
    TrdMarket.US: ["2024-01-01", "2024-07-04", "2024-12-25"],  # 美国假期
    TrdMarket.CN: ["2024-01-01", "2024-02-10", "2024-02-11"]   # 中国假期
}

# 每手股数配置（不同市场不同）
LOT_SIZE_CONFIG = {
    TrdMarket.HK: 100,  # 港股通常100股/手
    TrdMarket.US: 1,    # 美股1股/手
    TrdMarket.CN: 100   # A股100股/手
}

# 价格精度配置
PRICE_PRECISION = {
    TrdMarket.HK: 2,  # 港股价格精度0.01
    TrdMarket.US: 2,  # 美股价格精度0.01
    TrdMarket.CN: 2   # A股价格精度0.01
}