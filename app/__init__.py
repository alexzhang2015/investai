"""
InvestAI 应用包
"""
from app.agents.base import AgentOrchestrator
from app.agents.data_collector import DataCollectionAgent
from app.agents.fundamental_analyst import FundamentalAnalysisAgent
from app.agents.technical_analyst import TechnicalAnalysisAgent
from app.agents.sentiment_analyst import SentimentAnalysisAgent
from app.agents.strategy_generator import StrategyGenerationAgent


def create_agent_orchestrator(config: dict) -> AgentOrchestrator:
    """创建并配置Agent编排器"""
    orchestrator = AgentOrchestrator(config)
    
    # 注册所有Agent
    data_collector = DataCollectionAgent(config)
    fundamental_analyst = FundamentalAnalysisAgent(config)
    technical_analyst = TechnicalAnalysisAgent(config)
    sentiment_analyst = SentimentAnalysisAgent(config)
    strategy_generator = StrategyGenerationAgent(config)
    
    orchestrator.register_agent(data_collector)
    orchestrator.register_agent(fundamental_analyst)
    orchestrator.register_agent(technical_analyst)
    orchestrator.register_agent(sentiment_analyst)
    orchestrator.register_agent(strategy_generator)
    
    return orchestrator