"""
Agent单元测试
"""
import pytest
import asyncio
from datetime import datetime

from app.agents.base import AgentTask
from app.agents.data_collector import DataCollectionAgent
from app.agents.fundamental_analyst import FundamentalAnalysisAgent
from app.agents.technical_analyst import TechnicalAnalysisAgent
from app.agents.sentiment_analyst import SentimentAnalysisAgent
from app.agents.strategy_generator import StrategyGenerationAgent


class TestDataCollectionAgent:
    """测试数据收集Agent"""
    
    @pytest.fixture
    def agent(self):
        return DataCollectionAgent({})
    
    @pytest.mark.asyncio
    async def test_execute_success(self, agent):
        """测试成功执行数据收集"""
        task = AgentTask(
            task_id="test_001",
            task_type="data_collection",
            input_data={
                'stock_code': '00700',
                'data_types': ['price', 'financial']
            }
        )
        
        result = await agent.execute(task)
        
        assert result.success is True
        assert 'price_data' in result.data
        assert 'financial_data' in result.data
        assert result.data['price_data']['current_price'] == 320.5


class TestFundamentalAnalysisAgent:
    """测试基本面分析Agent"""
    
    @pytest.fixture
    def agent(self):
        return FundamentalAnalysisAgent({})
    
    @pytest.mark.asyncio
    async def test_execute_success(self, agent):
        """测试成功执行基本面分析"""
        financial_data = {
            'revenue': 150000000000,
            'net_income': 25000000000,
            'total_assets': 800000000000,
            'total_liabilities': 450000000000,
            'shareholders_equity': 350000000000,
            'pe_ratio': 15.2,
            'pb_ratio': 1.1,
            'roe': 0.0714
        }
        
        task = AgentTask(
            task_id="test_002",
            task_type="fundamental_analysis",
            input_data={
                'stock_code': '00700',
                'financial_data': financial_data
            }
        )
        
        result = await agent.execute(task)
        
        assert result.success is True
        assert 'fundamental_score' in result.data
        assert 'financial_ratios' in result.data
        assert 'analysis_report' in result.data
        assert 0 <= result.data['fundamental_score'] <= 100


class TestTechnicalAnalysisAgent:
    """测试技术分析Agent"""
    
    @pytest.fixture
    def agent(self):
        return TechnicalAnalysisAgent({})
    
    @pytest.mark.asyncio
    async def test_execute_success(self, agent):
        """测试成功执行技术分析"""
        # 生成足够的数据点（至少20个）
        price_history = []
        base_price = 310
        for i in range(30):  # 生成30个数据点
            from datetime import datetime, timedelta
            date = (datetime(2024, 1, 10) + timedelta(days=i)).strftime('%Y-%m-%d')
            open_price = base_price + i * 2
            high_price = open_price + 5
            low_price = open_price - 3
            close_price = open_price + 2
            volume = 1000000 + i * 50000
            
            price_history.append({
                'date': date,
                'open': open_price,
                'high': high_price,
                'low': low_price,
                'close': close_price,
                'volume': volume
            })
        
        price_data = {'price_history': price_history}
        
        task = AgentTask(
            task_id="test_003",
            task_type="technical_analysis",
            input_data={
                'stock_code': '00700',
                'price_data': price_data
            }
        )
        
        result = await agent.execute(task)
        
        assert result.success is True
        assert 'technical_score' in result.data
        assert 'indicators' in result.data
        assert 'analysis_report' in result.data
        assert 0 <= result.data['technical_score'] <= 100


class TestSentimentAnalysisAgent:
    """测试情感分析Agent"""
    
    @pytest.fixture
    def agent(self):
        return SentimentAnalysisAgent({})
    
    @pytest.mark.asyncio
    async def test_execute_success(self, agent):
        """测试成功执行情感分析"""
        news_data = [
            {
                'title': '腾讯发布Q3财报，业绩超预期',
                'content': '腾讯控股发布第三季度财报，营收同比增长20%，净利润增长25%。',
                'source': '新浪财经',
                'published_at': '2024-01-15T10:00:00Z'
            }
        ]
        
        task = AgentTask(
            task_id="test_004",
            task_type="sentiment_analysis",
            input_data={
                'stock_code': '00700',
                'news_data': news_data
            }
        )
        
        result = await agent.execute(task)
        
        assert result.success is True
        assert 'sentiment_score' in result.data
        assert 'sentiment_results' in result.data
        assert 'analysis_report' in result.data
        assert 0 <= result.data['sentiment_score'] <= 100


class TestStrategyGenerationAgent:
    """测试策略生成Agent"""
    
    @pytest.fixture
    def agent(self):
        return StrategyGenerationAgent({})
    
    @pytest.mark.asyncio
    async def test_execute_success(self, agent):
        """测试成功执行策略生成"""
        analysis_results = {
            'fundamental': {'fundamental_score': 75},
            'technical': {'technical_score': 82},
            'sentiment': {'sentiment_score': 68}
        }
        
        task = AgentTask(
            task_id="test_005",
            task_type="strategy_generation",
            input_data={
                'stock_code': '00700',
                'analysis_results': analysis_results,
                'risk_profile': 'moderate',
                'current_price': 320.5
            }
        )
        
        result = await agent.execute(task)
        
        assert result.success is True
        assert 'investment_score' in result.data
        assert 'recommendation' in result.data
        assert 'price_targets' in result.data
        assert 'analysis_report' in result.data
        assert 0 <= result.data['investment_score'] <= 100