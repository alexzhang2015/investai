# 富途开放平台配置
# Futu OpenAPI Configuration

from dataclasses import dataclass
from enum import Enum
from typing import Optional

class TrdMarket(Enum):
    """交易市场枚举"""
    HK = 1  # 港股市场
    US = 2  # 美股市场
    CN = 3  # A股市场
    FUTURES = 4  # 期货市场
    SG = 5  # 新加坡市场
    JP = 6  # 日本市场

class TrdEnv(Enum):
    """交易环境枚举"""
    REAL = 0  # 真实交易环境
    SIMULATE = 1  # 模拟交易环境

class OrderType(Enum):
    """订单类型枚举"""
    NORMAL = 0  # 普通订单
    MARKET = 1  # 市价订单
    LIMIT = 2   # 限价订单
    STOP = 3    # 止损订单
    STOP_LIMIT = 4  # 止损限价订单
    TRAILING_STOP = 5  # 跟踪止损订单
    ICEBERG = 6  # 冰山订单

class TrdSide(Enum):
    """交易方向枚举"""
    BUY = 1  # 买入
    SELL = 2  # 卖出

class OrderStatus(Enum):
    """订单状态枚举"""
    UNSUBMITTED = 0  # 未提交
    WAITING_SUBMIT = 1  # 等待提交
    SUBMITTING = 2  # 提交中
    SUBMITTED = 3  # 已提交
    FILLED = 4  # 全部成交
    PARTIAL_FILLED = 5  # 部分成交
    CANCELLING = 6  # 取消中
    CANCELLED = 7  # 已取消
    FAILED = 8  # 失败
    DISABLED = 9  # 已禁用

class SecurityType(Enum):
    """证券类型枚举"""
    STOCK = 1  # 股票
    ETF = 2  # ETF
    WARRANT = 3  # 窝轮
    BOND = 4  # 债券
    INDEX = 5  # 指数
    FUTURES = 6  # 期货
    OPTION = 7  # 期权

@dataclass
class FutuConfig:
    """富途API配置"""
    host: str = "127.0.0.1"
    port: int = 11111
    api_key: str = ""
    api_secret: str = ""
    env: TrdEnv = TrdEnv.SIMULATE
    
    # 连接配置
    timeout: int = 30  # 超时时间(秒)
    retry_attempts: int = 3  # 重试次数
    
    # 交易配置
    default_market: TrdMarket = TrdMarket.HK
    min_order_quantity: int = 100  # 最小交易数量
    
    def get_base_url(self) -> str:
        """获取基础URL"""
        return f"http://{self.host}:{self.port}"

@dataclass
class TradingConfig:
    """交易配置"""
    # 风险控制配置
    max_position_percent: float = 0.2  # 单只股票最大持仓比例
    max_trade_amount: float = 100000.0  # 单笔交易最大金额
    stop_loss_percent: float = 0.1  # 止损百分比
    take_profit_percent: float = 0.2  # 止盈百分比
    
    # 交易时间配置
    trading_start_time: str = "09:30:00"
    trading_end_time: str = "16:00:00"
    
    # 市场配置
    supported_markets: list = None
    
    def __post_init__(self):
        if self.supported_markets is None:
            self.supported_markets = [TrdMarket.HK, TrdMarket.US]

# 默认配置
def get_default_futu_config() -> FutuConfig:
    """获取默认富途配置"""
    return FutuConfig(
        host="127.0.0.1",
        port=11111,
        env=TrdEnv.SIMULATE
    )

def get_default_trading_config() -> TradingConfig:
    """获取默认交易配置"""
    return TradingConfig()

# 市场代码映射
MARKET_CODE_MAP = {
    "HK": TrdMarket.HK,
    "US": TrdMarket.US, 
    "SH": TrdMarket.CN,
    "SZ": TrdMarket.CN,
    "CN": TrdMarket.CN,
    "FUTURES": TrdMarket.FUTURES,
    "SG": TrdMarket.SG,
    "JP": TrdMarket.JP
}

# 订单类型映射
ORDER_TYPE_MAP = {
    "market": OrderType.MARKET,
    "limit": OrderType.LIMIT,
    "stop": OrderType.STOP,
    "stop_limit": OrderType.STOP_LIMIT,
    "trailing_stop": OrderType.TRAILING_STOP
}

# 错误码映射
ERROR_CODE_MAP = {
    1001: "无效的API密钥",
    1002: "交易权限不足", 
    2001: "无效的股票代码",
    2002: "不支持的交易市场",
    3001: "下单数量错误",
    3002: "下单价格错误",
    4001: "资金不足",
    4002: "持仓不足",
    5001: "系统繁忙",
    5002: "网络超时"
}