"""
数据收集Agent - 负责从多个数据源收集股票数据
"""
import aiohttp
import asyncio
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json
import os
from loguru import logger

from app.agents.base import BaseAgent, AgentTask, AgentResult


class DataCollectionAgent(BaseAgent):
    """数据收集Agent"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("data_collector", config)
        self.data_sources = self._init_data_sources()
        self.session = None
    
    def _init_data_sources(self) -> Dict[str, Any]:
        """初始化数据源配置"""
        return {
            'tushare': {
                'api_key': os.getenv('TUSHARE_API_TOKEN', ''),
                'base_url': 'https://api.tushare.pro'
            },
            'alpha_vantage': {
                'api_key': os.getenv('ALPHA_VANTAGE_API_KEY', ''),
                'base_url': 'https://www.alphavantage.co/query'
            },
            'news_api': {
                'api_key': os.getenv('NEWS_API_KEY', ''),
                'base_url': 'https://newsapi.org/v2'
            },
            'eastmoney': {
                'base_url': 'https://datacenter.eastmoney.com'
            }
        }
    
    async def initialize(self):
        """初始化Agent"""
        self.session = aiohttp.ClientSession()
        logger.info("DataCollectionAgent initialized")
    
    async def execute(self, task: AgentTask) -> AgentResult:
        """执行数据收集任务"""
        start_time = datetime.now()
        
        try:
            stock_code = task.input_data.get('stock_code')
            data_types = task.input_data.get('data_types', ['price', 'financial', 'news'])
            
            if not stock_code:
                return AgentResult(
                    task_id=task.task_id,
                    success=False,
                    data={},
                    error_msg="Stock code is required"
                )
            
            # 检查缓存
            cache_key = f"stock_data:{stock_code}:{'-'.join(sorted(data_types))}"
            cached_result = self._get_cached_result(cache_key)
            if cached_result:
                logger.info(f"Using cached data for {stock_code}")
                return AgentResult(
                    task_id=task.task_id,
                    success=True,
                    data=cached_result,
                    execution_time=(datetime.now() - start_time).total_seconds()
                )
            
            # 并行收集数据
            collection_tasks = []
            
            if 'price' in data_types:
                collection_tasks.append(self._fetch_price_data(stock_code))
            if 'financial' in data_types:
                collection_tasks.append(self._fetch_financial_data(stock_code))
            if 'news' in data_types:
                collection_tasks.append(self._fetch_news_data(stock_code))
            if 'technical' in data_types:
                collection_tasks.append(self._fetch_technical_data(stock_code))
            
            # 等待所有数据收集完成
            results = await asyncio.gather(*collection_tasks, return_exceptions=True)
            
            # 处理结果
            collected_data = {}
            for result in results:
                if isinstance(result, Exception):
                    logger.warning(f"Data collection failed: {result}")
                    continue
                if result:
                    collected_data.update(result)
            
            # 缓存结果
            self._cache_result(cache_key, collected_data, 1800)  # 缓存30分钟
            
            return AgentResult(
                task_id=task.task_id,
                success=True,
                data=collected_data,
                execution_time=(datetime.now() - start_time).total_seconds()
            )
            
        except Exception as e:
            logger.error(f"Data collection failed: {e}")
            return AgentResult(
                task_id=task.task_id,
                success=False,
                data={},
                error_msg=str(e),
                execution_time=(datetime.now() - start_time).total_seconds()
            )
    
    async def _fetch_price_data(self, stock_code: str) -> Dict[str, Any]:
        """获取股价数据"""
        try:
            # 这里使用模拟数据，实际应该调用真实API
            # 例如：Tushare、Alpha Vantage、Yahoo Finance等
            
            # 模拟API调用
            await asyncio.sleep(0.1)  # 模拟网络延迟
            
            price_data = {
                'current_price': 320.5,
                'price_change': 5.2,
                'price_change_percent': 1.65,
                'open_price': 318.0,
                'high_price': 322.0,
                'low_price': 317.5,
                'volume': 12500000,
                'market_cap': 3800000000000,
                'price_history': [
                    {'date': '2024-01-10', 'close': 315.2},
                    {'date': '2024-01-11', 'close': 318.5},
                    {'date': '2024-01-12', 'close': 320.1},
                    {'date': '2024-01-15', 'close': 320.5}
                ]
            }
            
            return {'price_data': price_data}
            
        except Exception as e:
            logger.warning(f"Failed to fetch price data for {stock_code}: {e}")
            return {}
    
    async def _fetch_financial_data(self, stock_code: str) -> Dict[str, Any]:
        """获取财务数据"""
        try:
            # 模拟财务数据API调用
            await asyncio.sleep(0.2)
            
            financial_data = {
                'revenue': 150000000000,  # 1500亿
                'net_income': 25000000000,  # 250亿
                'total_assets': 800000000000,  # 8000亿
                'total_liabilities': 450000000000,  # 4500亿
                'shareholders_equity': 350000000000,  # 3500亿
                'operating_cash_flow': 40000000000,  # 400亿
                'pe_ratio': 15.2,
                'pb_ratio': 1.1,
                'roe': 0.0714,  # 7.14%
                'debt_ratio': 0.5625,  # 56.25%
                'profit_margin': 0.1667,  # 16.67%
                'latest_report_date': '2023-09-30'
            }
            
            return {'financial_data': financial_data}
            
        except Exception as e:
            logger.warning(f"Failed to fetch financial data for {stock_code}: {e}")
            return {}
    
    async def _fetch_news_data(self, stock_code: str) -> Dict[str, Any]:
        """获取新闻数据"""
        try:
            # 模拟新闻API调用
            await asyncio.sleep(0.15)
            
            news_data = [
                {
                    'title': '腾讯发布Q3财报，业绩超预期',
                    'content': '腾讯控股发布第三季度财报，营收同比增长20%，净利润增长25%。',
                    'source': '新浪财经',
                    'published_at': '2024-01-15T10:00:00Z',
                    'sentiment': 'positive',
                    'relevance_score': 0.95
                },
                {
                    'title': '游戏业务持续增长，腾讯股价创新高',
                    'content': '腾讯游戏业务表现强劲，多款新游戏上线获得好评。',
                    'source': '东方财富',
                    'published_at': '2024-01-14T15:30:00Z',
                    'sentiment': 'positive',
                    'relevance_score': 0.85
                },
                {
                    'title': '监管政策影响，科技股面临调整',
                    'content': '近期监管政策收紧，科技股整体面临调整压力。',
                    'source': '华尔街见闻',
                    'published_at': '2024-01-13T09:15:00Z',
                    'sentiment': 'neutral',
                    'relevance_score': 0.70
                }
            ]
            
            return {'news_data': news_data}
            
        except Exception as e:
            logger.warning(f"Failed to fetch news data for {stock_code}: {e}")
            return {}
    
    async def _fetch_technical_data(self, stock_code: str) -> Dict[str, Any]:
        """获取技术指标数据"""
        try:
            # 模拟技术指标数据
            await asyncio.sleep(0.1)
            
            technical_data = {
                'ma_5': 319.8,
                'ma_20': 315.2,
                'ma_60': 305.6,
                'rsi': 65.3,
                'macd': 2.1,
                'macd_signal': 1.8,
                'bollinger_upper': 325.4,
                'bollinger_middle': 315.2,
                'bollinger_lower': 305.0,
                'volume_ma_20': 12000000,
                'support_level': 315.0,
                'resistance_level': 325.0
            }
            
            return {'technical_data': technical_data}
            
        except Exception as e:
            logger.warning(f"Failed to fetch technical data for {stock_code}: {e}")
            return {}
    
    async def cleanup(self):
        """清理资源"""
        if self.session:
            await self.session.close()
            logger.info("DataCollectionAgent cleaned up")


# 使用示例
async def test_data_collection():
    """测试数据收集Agent"""
    config = {
        'REDIS_URL': 'redis://localhost:6379/0'
    }
    
    agent = DataCollectionAgent(config)
    await agent.initialize()
    
    task = AgentTask(
        task_id="test_001",
        task_type="data_collection",
        input_data={
            'stock_code': '00700',
            'data_types': ['price', 'financial', 'news']
        }
    )
    
    result = await agent.execute(task)
    print(f"Success: {result.success}")
    print(f"Data keys: {list(result.data.keys())}")
    
    await agent.cleanup()


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_data_collection())