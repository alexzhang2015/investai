# Futu OpenAPI Trading Integration for InvestAI
# 富途牛牛开放平台交易集成

import asyncio
import logging
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import aiohttp
from datetime import datetime
import json

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrdMarket(Enum):
    """交易市场枚举"""
    HK = 1  # 港股
    US = 2  # 美股
    CN = 3  # A股
    FUTURES = 4  # 期货
    
class TrdEnv(Enum):
    """交易环境枚举"""
    REAL = 0  # 真实交易
    SIMULATE = 1  # 模拟交易

class OrderType(Enum):
    """订单类型枚举"""
    NORMAL = 0  # 普通订单
    MARKET = 1  # 市价订单
    LIMIT = 2   # 限价订单
    STOP = 3    # 止损订单
    STOP_LIMIT = 4  # 止损限价订单

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

@dataclass
class FutuConfig:
    """富途API配置"""
    host: str = "127.0.0.1"
    port: int = 11111
    api_key: str = ""
    api_secret: str = ""
    env: TrdEnv = TrdEnv.SIMULATE  # 默认模拟环境

@dataclass
class OrderRequest:
    """订单请求"""
    symbol: str  # 股票代码
    market: TrdMarket  # 交易市场
    side: TrdSide  # 买卖方向
    order_type: OrderType  # 订单类型
    quantity: int  # 数量
    price: Optional[float] = None  # 价格（限价单需要）
    stop_price: Optional[float] = None  # 止损价格
    account_id: Optional[str] = None  # 账户ID

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
    symbol: str
    market: TrdMarket
    quantity: int
    avg_price: float
    market_value: float
    unrealized_pnl: float
    realized_pnl: float

@dataclass
class AccountInfo:
    """账户信息"""
    account_id: str
    total_assets: float
    cash: float
    market_value: float
    available_cash: float
    currency: str

class FutuTradingClient:
    """富途交易客户端"""
    
    def __init__(self, config: FutuConfig):
        self.config = config
        self.base_url = f"http://{config.host}:{config.port}"
        self.session = None
        self.connected = False
    
    async def connect(self):
        """连接到富途OpenD"""
        try:
            self.session = aiohttp.ClientSession()
            # 测试连接
            async with self.session.get(f"{self.base_url}/api/v1/ping") as response:
                if response.status == 200:
                    self.connected = True
                    logger.info("成功连接到富途OpenD")
                    return True
        except Exception as e:
            logger.error(f"连接富途OpenD失败: {e}")
            return False
    
    async def disconnect(self):
        """断开连接"""
        if self.session:
            await self.session.close()
            self.connected = False
            logger.info("已断开富途OpenD连接")
    
    async def place_order(self, order_req: OrderRequest) -> OrderResponse:
        """下单"""
        if not self.connected:
            return OrderResponse(success=False, error_msg="未连接到富途OpenD")
        
        try:
            # 构建下单请求
            payload = {
                "symbol": order_req.symbol,
                "market": order_req.market.value,
                "side": order_req.side.value,
                "order_type": order_req.order_type.value,
                "quantity": order_req.quantity,
                "env": self.config.env.value
            }
            
            if order_req.price is not None:
                payload["price"] = order_req.price
            if order_req.stop_price is not None:
                payload["stop_price"] = order_req.stop_price
            if order_req.account_id is not None:
                payload["account_id"] = order_req.account_id
            
            async with self.session.post(
                f"{self.base_url}/api/v1/trade/order",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                result = await response.json()
                
                if response.status == 200 and result.get("success"):
                    return OrderResponse(
                        success=True,
                        order_id=result.get("order_id")
                    )
                else:
                    return OrderResponse(
                        success=False,
                        error_code=result.get("error_code"),
                        error_msg=result.get("error_msg")
                    )
                    
        except Exception as e:
            logger.error(f"下单失败: {e}")
            return OrderResponse(success=False, error_msg=str(e))
    
    async def cancel_order(self, order_id: str, market: TrdMarket) -> OrderResponse:
        """撤单"""
        if not self.connected:
            return OrderResponse(success=False, error_msg="未连接到富途OpenD")
        
        try:
            payload = {
                "order_id": order_id,
                "market": market.value,
                "env": self.config.env.value
            }
            
            async with self.session.post(
                f"{self.base_url}/api/v1/trade/cancel_order",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                result = await response.json()
                
                if response.status == 200 and result.get("success"):
                    return OrderResponse(success=True)
                else:
                    return OrderResponse(
                        success=False,
                        error_code=result.get("error_code"),
                        error_msg=result.get("error_msg")
                    )
                    
        except Exception as e:
            logger.error(f"撤单失败: {e}")
            return OrderResponse(success=False, error_msg=str(e))
    
    async def get_order_status(self, order_id: str, market: TrdMarket) -> Dict[str, Any]:
        """查询订单状态"""
        if not self.connected:
            return {"success": False, "error": "未连接到富途OpenD"}
        
        try:
            params = {
                "order_id": order_id,
                "market": market.value,
                "env": self.config.env.value
            }
            
            async with self.session.get(
                f"{self.base_url}/api/v1/trade/order_status",
                params=params
            ) as response:
                return await response.json()
                
        except Exception as e:
            logger.error(f"查询订单状态失败: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_positions(self, market: TrdMarket) -> List[Position]:
        """获取持仓列表"""
        if not self.connected:
            return []
        
        try:
            params = {
                "market": market.value,
                "env": self.config.env.value
            }
            
            async with self.session.get(
                f"{self.base_url}/api/v1/trade/positions",
                params=params
            ) as response:
                result = await response.json()
                
                if result.get("success"):
                    positions = []
                    for pos_data in result.get("positions", []):
                        positions.append(Position(
                            symbol=pos_data.get("symbol"),
                            market=TrdMarket(pos_data.get("market")),
                            quantity=pos_data.get("quantity"),
                            avg_price=pos_data.get("avg_price"),
                            market_value=pos_data.get("market_value"),
                            unrealized_pnl=pos_data.get("unrealized_pnl"),
                            realized_pnl=pos_data.get("realized_pnl")
                        ))
                    return positions
                else:
                    return []
                    
        except Exception as e:
            logger.error(f"获取持仓失败: {e}")
            return []
    
    async def get_account_info(self) -> Optional[AccountInfo]:
        """获取账户信息"""
        if not self.connected:
            return None
        
        try:
            params = {
                "env": self.config.env.value
            }
            
            async with self.session.get(
                f"{self.base_url}/api/v1/trade/account",
                params=params
            ) as response:
                result = await response.json()
                
                if result.get("success"):
                    acc_data = result.get("account", {})
                    return AccountInfo(
                        account_id=acc_data.get("account_id"),
                        total_assets=acc_data.get("total_assets"),
                        cash=acc_data.get("cash"),
                        market_value=acc_data.get("market_value"),
                        available_cash=acc_data.get("available_cash"),
                        currency=acc_data.get("currency")
                    )
                else:
                    return None
                    
        except Exception as e:
            logger.error(f"获取账户信息失败: {e}")
            return None

class TradingExecutionAgent:
    """交易执行Agent"""
    
    def __init__(self, futu_config: FutuConfig):
        self.futu_client = FutuTradingClient(futu_config)
        self.connected = False
    
    async def initialize(self):
        """初始化交易Agent"""
        self.connected = await self.futu_client.connect()
        return self.connected
    
    async def execute_trade(self, analysis_result: Dict, user_profile: Dict) -> OrderResponse:
        """执行交易"""
        if not self.connected:
            return OrderResponse(success=False, error_msg="交易Agent未初始化")
        
        try:
            # 从分析结果中提取交易信息
            stock_code = analysis_result.get("stock_code")
            recommendation = analysis_result.get("recommendation")
            confidence = analysis_result.get("confidence", 0.5)
            target_price = analysis_result.get("target_price")
            
            # 确定交易方向和数量
            if recommendation == "buy":
                side = TrdSide.BUY
                # 根据用户风险偏好和账户资金计算数量
                quantity = await self._calculate_quantity(user_profile, target_price)
            elif recommendation == "sell":
                side = TrdSide.SELL
                # 检查是否有持仓
                positions = await self.futu_client.get_positions(TrdMarket.HK)
                quantity = self._get_position_quantity(positions, stock_code)
                if quantity == 0:
                    return OrderResponse(success=False, error_msg="无持仓可卖出")
            else:
                return OrderResponse(success=False, error_msg="无交易建议")
            
            # 构建订单请求
            order_req = OrderRequest(
                symbol=stock_code,
                market=TrdMarket.HK,  # 默认港股市场
                side=side,
                order_type=OrderType.LIMIT if target_price else OrderType.MARKET,
                quantity=quantity,
                price=target_price if target_price else None
            )
            
            # 执行下单
            return await self.futu_client.place_order(order_req)
            
        except Exception as e:
            logger.error(f"交易执行失败: {e}")
            return OrderResponse(success=False, error_msg=str(e))
    
    async def _calculate_quantity(self, user_profile: Dict, target_price: float) -> int:
        """计算购买数量"""
        # 获取账户信息
        account_info = await self.futu_client.get_account_info()
        if not account_info:
            return 100  # 默认100股
        
        # 根据风险偏好计算投资金额
        risk_level = user_profile.get("risk_level", "medium")
        
        if risk_level == "conservative":
            investment_amount = account_info.available_cash * 0.1  # 10%资金
        elif risk_level == "aggressive":
            investment_amount = account_info.available_cash * 0.3  # 30%资金
        else:
            investment_amount = account_info.available_cash * 0.2  # 20%资金
        
        # 计算股数
        quantity = int(investment_amount / target_price) if target_price > 0 else 100
        
        # 确保最小交易单位
        quantity = max(100, quantity)  # 港股最小100股
        quantity = quantity // 100 * 100  # 取整百
        
        return quantity
    
    def _get_position_quantity(self, positions: List[Position], symbol: str) -> int:
        """获取指定股票的持仓数量"""
        for position in positions:
            if position.symbol == symbol:
                return position.quantity
        return 0
    
    async def monitor_orders(self):
        """监控订单状态"""
        # 这里可以实现订单状态监控逻辑
        pass
    
    async def cleanup(self):
        """清理资源"""
        await self.futu_client.disconnect()

# 使用示例
async def main():
    """交易集成示例"""
    
    # 配置富途API
    config = FutuConfig(
        host="127.0.0.1",
        port=11111,
        env=TrdEnv.SIMULATE  # 使用模拟交易环境
    )
    
    # 创建交易Agent
    trading_agent = TradingExecutionAgent(config)
    
    # 初始化连接
    if await trading_agent.initialize():
        print("交易Agent初始化成功")
        
        # 模拟分析结果
        analysis_result = {
            "stock_code": "00700",  # 腾讯控股
            "recommendation": "buy",
            "confidence": 0.75,
            "target_price": 320.0
        }
        
        # 模拟用户配置
        user_profile = {
            "risk_level": "medium",
            "investment_horizon": "long_term"
        }
        
        # 执行交易
        result = await trading_agent.execute_trade(analysis_result, user_profile)
        
        if result.success:
            print(f"交易执行成功，订单ID: {result.order_id}")
        else:
            print(f"交易执行失败: {result.error_msg}")
        
        # 获取持仓信息
        positions = await trading_agent.futu_client.get_positions(TrdMarket.HK)
        print(f"当前持仓: {len(positions)} 只股票")
        
        # 获取账户信息
        account_info = await trading_agent.futu_client.get_account_info()
        if account_info:
            print(f"账户总资产: {account_info.total_assets}")
            print(f"可用资金: {account_info.available_cash}")
        
        # 清理资源
        await trading_agent.cleanup()
    else:
        print("交易Agent初始化失败")

if __name__ == "__main__":
    # 运行示例
    asyncio.run(main())