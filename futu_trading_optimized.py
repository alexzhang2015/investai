# 富途开放平台优化实现
# 基于官方文档最佳实践

import asyncio
import logging
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, time
import pandas as pd

# 配置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# 富途API枚举定义（根据官方文档）
class TrdMarket(Enum):
    """交易市场"""
    HK = 1  # 港股
    US = 2  # 美股
    CN = 3  # A股
    FUTURES = 4  # 期货
    SG = 5  # 新加坡
    JP = 6  # 日本

class TrdEnv(Enum):
    """交易环境"""
    REAL = 0  # 真实交易
    SIMULATE = 1  # 模拟交易

class TrdSide(Enum):
    """交易方向"""
    BUY = 1  # 买入
    SELL = 2  # 卖出

class OrderType(Enum):
    """订单类型"""
    NORMAL = 0  # 普通单
    MARKET = 1  # 市价单
    LIMIT = 2   # 限价单
    STOP = 3    # 止损单
    STOP_LIMIT = 4  # 止损限价单

class OrderStatus(Enum):
    """订单状态"""
    UNSUBMITTED = 0
    WAITING_SUBMIT = 1
    SUBMITTING = 2
    SUBMITTED = 3
    FILLED = 4
    PARTIAL_FILLED = 5
    CANCELLING = 6
    CANCELLED = 7
    FAILED = 8
    DISABLED = 9

@dataclass
class OrderRequest:
    """订单请求"""
    code: str  # 股票代码，格式: HK.00700
    price: float  # 价格
    qty: int  # 数量
    trd_side: TrdSide  # 交易方向
    order_type: OrderType = OrderType.NORMAL
    trd_env: TrdEnv = TrdEnv.SIMULATE
    remark: str = ""  # 订单备注（策略标识）

@dataclass
class OrderResponse:
    """订单响应"""
    success: bool
    order_id: Optional[str] = None
    error_code: Optional[int] = None
    error_msg: Optional[str] = None
    timestamp: datetime = datetime.now()

@dataclass
class Position:
    """持仓信息"""
    code: str  # 股票代码
    qty: int  # 持仓数量
    can_sell_qty: int  # 可卖数量
    cost_price: float  # 成本价
    market_val: float  # 市值
    pl_ratio: float  # 盈亏比例

@dataclass
class AccountInfo:
    """账户信息"""
    power: float  # 购买力
    total_assets: float  # 总资产
    cash: float  # 现金
    market_val: float  # 股票市值
    available_cash: float  # 可用现金

@dataclass
class MarketSnapshot:
    """市场快照"""
    code: str
    last_price: float  # 最新价
    open_price: float  # 开盘价
    high_price: float  # 最高价
    low_price: float  # 最低价
    volume: int  # 成交量
    turnover: float  # 成交额
    pe_ratio: float  # 市盈率
    pb_ratio: float  # 市净率
    lot_size: int  # 每手股数

class FutuTradingContext:
    """富途交易上下文（模拟官方API设计）"""
    
    def __init__(self, host: str = "127.0.0.1", port: int = 11111):
        self.host = host
        self.port = port
        self.conn_id = None
        self.connected = False
        self.base_url = f"http://{host}:{port}"
        
    async def open(self) -> bool:
        """打开连接"""
        try:
            # 模拟连接过程
            logger.info(f"Connecting to Futu OpenD at {self.host}:{self.port}")
            
            # 这里应该是实际的连接逻辑
            # 根据文档，连接会返回conn_id和加密密钥
            self.conn_id = "simulated_conn_id_123"
            self.connected = True
            
            logger.info("Successfully connected to Futu OpenD")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to Futu OpenD: {e}")
            return False
    
    async def close(self):
        """关闭连接"""
        if self.connected:
            logger.info("Closing Futu OpenD connection")
            self.connected = False
            self.conn_id = None
    
    async def unlock_trade(self, password: str) -> bool:
        """解锁交易"""
        if not self.connected:
            return False
            
        logger.info("Trading unlocked successfully")
        return True
    
    async def place_order(self, 
                         price: float, 
                         qty: int, 
                         code: str, 
                         trd_side: TrdSide, 
                         order_type: OrderType = OrderType.NORMAL,
                         trd_env: TrdEnv = TrdEnv.SIMULATE,
                         remark: str = "") -> OrderResponse:
        """下单（遵循官方API参数顺序）"""
        if not self.connected:
            return OrderResponse(success=False, error_msg="Not connected")
        
        try:
            # 检查交易时间
            if not self._is_trading_time():
                return OrderResponse(success=False, error_msg="Not in trading hours")
            
            # 检查购买力/持仓
            if trd_side == TrdSide.BUY:
                account_info = await self.get_acc_info()
                if account_info and price * qty > account_info.power:
                    return OrderResponse(success=False, error_msg="Insufficient buying power")
            
            # 模拟下单成功
            order_id = f"ORDER_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{code}"
            
            logger.info(f"Order placed: {order_id}, {trd_side.name} {qty} {code} @ {price}")
            
            return OrderResponse(
                success=True,
                order_id=order_id
            )
            
        except Exception as e:
            logger.error(f"Place order failed: {e}")
            return OrderResponse(success=False, error_msg=str(e))
    
    async def get_acc_info(self, trd_env: TrdEnv = TrdEnv.SIMULATE) -> Optional[AccountInfo]:
        """获取账户信息"""
        if not self.connected:
            return None
            
        # 模拟账户信息
        return AccountInfo(
            power=100000.0,  # 10万购买力
            total_assets=150000.0,
            cash=50000.0,
            market_val=100000.0,
            available_cash=50000.0
        )
    
    async def position_list(self, trd_env: TrdEnv = TrdEnv.SIMULATE) -> List[Position]:
        """获取持仓列表"""
        if not self.connected:
            return []
            
        # 模拟持仓数据
        return [
            Position(
                code="HK.00700",  # 腾讯
                qty=200,
                can_sell_qty=200,
                cost_price=320.0,
                market_val=64000.0,
                pl_ratio=0.15
            )
        ]
    
    async def order_list(self, trd_env: TrdEnv = TrdEnv.SIMULATE) -> List[Dict]:
        """获取订单列表"""
        if not self.connected:
            return []
            
        return []
    
    def _is_trading_time(self) -> bool:
        """检查是否在交易时间内"""
        now = datetime.now().time()
        trading_start = time(9, 30)  # 9:30
        trading_end = time(16, 0)    # 16:00
        
        # 周末不交易
        if datetime.now().weekday() >= 5:
            return False
            
        return trading_start <= now <= trading_end

class StrategyBase:
    """策略基类（遵循官方策略模式）"""
    
    def __init__(self, trd_ctx: FutuTradingContext):
        self.trd_ctx = trd_ctx
        self.positions = {}
        self.orders = {}
        self.account_info = None
        
    async def on_init(self):
        """策略初始化"""
        logger.info("Strategy initializing...")
        
        # 连接交易上下文
        if not await self.trd_ctx.open():
            raise Exception("Failed to connect to trading context")
        
        # 解锁交易
        if not await self.trd_ctx.unlock_trade("your_password"):
            raise Exception("Failed to unlock trading")
        
        # 获取初始数据
        await self._refresh_data()
        
        logger.info("Strategy initialized successfully")
    
    async def on_tick(self, snapshot: MarketSnapshot):
        """逐笔行情回调"""
        # 由子类实现具体逻辑
        pass
    
    async def on_bar(self, bar_data: Dict):
        """K线回调"""
        # 由子类实现具体逻辑
        pass
    
    async def on_order_status(self, order_data: Dict):
        """订单状态回调"""
        order_id = order_data.get('order_id')
        status = order_data.get('status')
        
        logger.info(f"Order {order_id} status changed to {status}")
        
        # 更新订单状态
        if order_id in self.orders:
            self.orders[order_id].update(order_data)
    
    async def on_fill(self, fill_data: Dict):
        """成交回调"""
        logger.info(f"Order filled: {fill_data}")
        
        # 更新持仓
        await self._refresh_data()
    
    async def place_strategy_order(self, 
                                  code: str, 
                                  price: float, 
                                  qty: int, 
                                  trd_side: TrdSide,
                                  order_type: OrderType = OrderType.NORMAL,
                                  remark: str = "") -> OrderResponse:
        """策略下单（带风险控制）"""
        
        # 检查最小交易单位
        lot_size = 100  # 默认每手100股
        if qty % lot_size != 0:
            qty = (qty // lot_size) * lot_size
            if qty == 0:
                qty = lot_size
        
        # 风险控制检查
        risk_check = await self._risk_control_check(code, price, qty, trd_side)
        if not risk_check["pass"]:
            return OrderResponse(success=False, error_msg=risk_check["reason"])
        
        # 执行下单
        response = await self.trd_ctx.place_order(
            price=price,
            qty=qty,
            code=code,
            trd_side=trd_side,
            order_type=order_type,
            remark=f"{self.__class__.__name__}:{remark}"
        )
        
        if response.success:
            # 记录订单
            self.orders[response.order_id] = {
                'code': code,
                'price': price,
                'qty': qty,
                'trd_side': trd_side,
                'status': 'SUBMITTED',
                'timestamp': datetime.now()
            }
        
        return response
    
    async def _risk_control_check(self, code: str, price: float, qty: int, trd_side: TrdSide) -> Dict:
        """风险控制检查"""
        
        # 刷新账户数据
        await self._refresh_data()
        
        if not self.account_info:
            return {"pass": False, "reason": "Account info not available"}
        
        trade_amount = price * qty
        
        # 买入检查
        if trd_side == TrdSide.BUY:
            # 购买力检查
            if trade_amount > self.account_info.power:
                return {"pass": False, "reason": "Insufficient buying power"}
            
            # 单笔交易金额限制
            if trade_amount > 50000:  # 最大5万/笔
                return {"pass": False, "reason": "Exceeded single trade limit"}
        
        # 卖出检查
        elif trd_side == TrdSide.SELL:
            # 持仓检查
            if code not in self.positions:
                return {"pass": False, "reason": "No position to sell"}
            
            position = self.positions[code]
            if qty > position.can_sell_qty:
                return {"pass": False, "reason": "Exceeded available quantity"}
        
        return {"pass": True, "reason": ""}
    
    async def _refresh_data(self):
        """刷新策略数据"""
        try:
            # 获取账户信息
            self.account_info = await self.trd_ctx.get_acc_info()
            
            # 获取持仓
            positions = await self.trd_ctx.position_list()
            self.positions = {pos.code: pos for pos in positions}
            
        except Exception as e:
            logger.error(f"Failed to refresh strategy data: {e}")
    
    async def cleanup(self):
        """清理资源"""
        await self.trd_ctx.close()

class MovingAverageStrategy(StrategyBase):
    """双均线策略示例（基于官方策略模式）"""
    
    def __init__(self, trd_ctx: FutuTradingContext):
        super().__init__(trd_ctx)
        self.fast_ma = 5  # 快线周期
        self.slow_ma = 20  # 慢线周期
        self.price_data = []  # 价格数据
        
    async def on_bar(self, bar_data: Dict):
        """K线回调"""
        try:
            code = bar_data['code']
            close_price = bar_data['close']
            
            # 更新价格数据
            self.price_data.append(close_price)
            if len(self.price_data) > self.slow_ma:
                self.price_data.pop(0)
            
            # 计算均线
            if len(self.price_data) >= self.slow_ma:
                fast_ma_value = sum(self.price_data[-self.fast_ma:]) / self.fast_ma
                slow_ma_value = sum(self.price_data) / len(self.price_data)
                
                # 生成交易信号
                await self._generate_signal(code, close_price, fast_ma_value, slow_ma_value)
                
        except Exception as e:
            logger.error(f"Error in on_bar: {e}")
    
    async def _generate_signal(self, code: str, current_price: float, fast_ma: float, slow_ma: float):
        """生成交易信号"""
        
        # 金叉：快线上穿慢线，买入信号
        if fast_ma > slow_ma and (code not in self.positions or self.positions[code].qty == 0):
            logger.info(f"Buy signal: {code} at {current_price}")
            
            # 计算下单数量（基于账户资金的20%）
            if self.account_info:
                investment_amount = self.account_info.power * 0.2
                qty = int(investment_amount / current_price)
                
                # 确保是最小交易单位的整数倍
                qty = (qty // 100) * 100
                if qty == 0:
                    qty = 100
                
                # 执行买入
                response = await self.place_strategy_order(
                    code=code,
                    price=current_price,
                    qty=qty,
                    trd_side=TrdSide.BUY,
                    remark="MA Golden Cross"
                )
                
                if response.success:
                    logger.info(f"Buy order placed: {response.order_id}")
        
        # 死叉：快线下穿慢线，卖出信号
        elif fast_ma < slow_ma and code in self.positions and self.positions[code].qty > 0:
            logger.info(f"Sell signal: {code} at {current_price}")
            
            # 执行卖出（平仓）
            position = self.positions[code]
            response = await self.place_strategy_order(
                code=code,
                price=current_price,
                qty=position.qty,
                trd_side=TrdSide.SELL,
                remark="MA Death Cross"
            )
            
            if response.success:
                logger.info(f"Sell order placed: {response.order_id}")

# 使用示例
async def demo_strategy():
    """策略演示"""
    
    # 创建交易上下文
    trd_ctx = FutuTradingContext()
    
    # 创建策略实例
    strategy = MovingAverageStrategy(trd_ctx)
    
    try:
        # 初始化策略
        await strategy.on_init()
        
        # 模拟接收K线数据
        mock_bars = [
            {'code': 'HK.00700', 'close': 320.0},
            {'code': 'HK.00700', 'close': 322.0},
            {'code': 'HK.00700', 'close': 325.0},
            {'code': 'HK.00700', 'close': 318.0},
            {'code': 'HK.00700', 'close': 315.0},
        ]
        
        for bar in mock_bars:
            await strategy.on_bar(bar)
            await asyncio.sleep(1)  # 模拟实时数据间隔
        
        # 显示最终状态
        logger.info(f"Final positions: {len(strategy.positions)}")
        logger.info(f"Final orders: {len(strategy.orders)}")
        
    except Exception as e:
        logger.error(f"Strategy error: {e}")
    finally:
        # 清理资源
        await strategy.cleanup()

if __name__ == "__main__":
    # 运行策略演示
    asyncio.run(demo_strategy())