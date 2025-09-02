# InvestAI 核心代码实现示例

from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
import asyncio
import aiohttp
import pandas as pd
from sqlalchemy import create_engine
from langchain.llms import OpenAI
from langchain.agents import initialize_agent, AgentType
from langchain.tools import Tool
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
import redis
import json

# ================================
# 数据模型定义
# ================================

@dataclass
class StockData:
    code: str
    name: str
    current_price: float
    price_change: float
    price_change_percent: float
    volume: int
    market_cap: float
    pe_ratio: Optional[float] = None
    pb_ratio: Optional[float] = None
    
@dataclass
class AnalysisResult:
    stock_code: str
    fundamental_score: int  # 0-100
    technical_score: int    # 0-100
    sentiment_score: int    # 0-100
    overall_score: int      # 0-100
    recommendation: str     # buy/hold/sell
    confidence: float       # 0-1
    target_price: Optional[float] = None
    stop_loss: Optional[float] = None
    reasoning: str = ""

# ================================
# 基础Agent框架
# ================================

class BaseInvestmentAgent:
    def __init__(self, name: str, llm_model: str = "gpt-3.5-turbo"):
        self.name = name
        self.llm = OpenAI(model_name=llm_model)
        self.redis_client = redis.Redis(host='localhost', port=6379, db=0)
        
    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        raise NotImplementedError
        
    def _cache_result(self, key: str, data: Dict, expire_seconds: int = 3600):
        """缓存分析结果"""
        self.redis_client.setex(key, expire_seconds, json.dumps(data, default=str))
        
    def _get_cached_result(self, key: str) -> Optional[Dict]:
        """获取缓存的分析结果"""
        cached = self.redis_client.get(key)
        return json.loads(cached) if cached else None

# ================================
# 数据收集Agent
# ================================

class DataCollectionAgent(BaseInvestmentAgent):
    def __init__(self):
        super().__init__("DataCollector")
        self.data_sources = {
            'tushare': 'your_tushare_token',
            'yahoo_finance': 'yahoo_api_key',
            'news_api': 'news_api_key'
        }
        
    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        stock_code = task_data['stock_code']
        data_types = task_data.get('data_types', ['price', 'financial', 'news'])
        
        # 检查缓存
        cache_key = f"stock_data:{stock_code}:{'-'.join(data_types)}"
        cached_result = self._get_cached_result(cache_key)
        if cached_result:
            return cached_result
            
        result = {}
        
        if 'price' in data_types:
            result['price_data'] = await self._fetch_price_data(stock_code)
        if 'financial' in data_types:
            result['financial_data'] = await self._fetch_financial_data(stock_code)
        if 'news' in data_types:
            result['news_data'] = await self._fetch_news_data(stock_code)
            
        # 缓存结果30分钟
        self._cache_result(cache_key, result, 1800)
        return result
        
    async def _fetch_price_data(self, stock_code: str) -> Dict:
        """获取股价数据"""
        # 模拟API调用
        async with aiohttp.ClientSession() as session:
            url = f"https://api.example.com/stock/{stock_code}/price"
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        'current_price': data.get('current_price'),
                        'price_history': data.get('price_history', []),
                        'volume': data.get('volume'),
                        'market_cap': data.get('market_cap')
                    }
        return {}
        
    async def _fetch_financial_data(self, stock_code: str) -> Dict:
        """获取财务数据"""
        # 这里应该调用真实的财务数据API
        return {
            'revenue': 1000000000,
            'net_income': 100000000,
            'total_assets': 5000000000,
            'total_liabilities': 3000000000,
            'pe_ratio': 15.5,
            'pb_ratio': 1.2,
            'roe': 0.15
        }
        
    async def _fetch_news_data(self, stock_code: str) -> List[Dict]:
        """获取新闻数据"""
        # 模拟新闻API调用
        return [
            {
                'title': '公司发布Q3财报，业绩超预期',
                'content': '公司第三季度营收同比增长20%...',
                'sentiment': 'positive',
                'published_at': datetime.now().isoformat()
            }
        ]

# ================================
# 基本面分析Agent
# ================================

class FundamentalAnalysisAgent(BaseInvestmentAgent):
    def __init__(self):
        super().__init__("FundamentalAnalyst")
        
    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        financial_data = task_data.get('financial_data', {})
        stock_code = task_data.get('stock_code')
        
        if not financial_data:
            return {'error': 'No financial data provided'}
            
        # 计算关键指标
        ratios = self._calculate_ratios(financial_data)
        
        # 使用LLM分析
        analysis_prompt = f"""
        作为专业的股票分析师，请分析以下财务数据：
        
        股票代码: {stock_code}
        财务比率:
        - P/E比率: {ratios.get('pe_ratio')}
        - P/B比率: {ratios.get('pb_ratio')} 
        - ROE: {ratios.get('roe')}
        - 债务比率: {ratios.get('debt_ratio')}
        - 营收: {financial_data.get('revenue')}
        - 净利润: {financial_data.get('net_income')}
        
        请提供：
        1. 基本面评分(0-100)
        2. 主要优势和风险
        3. 投资建议
        """
        
        llm_analysis = self.llm.predict(analysis_prompt)
        
        # 计算量化评分
        fundamental_score = self._calculate_fundamental_score(ratios)
        
        return {
            'fundamental_score': fundamental_score,
            'financial_ratios': ratios,
            'llm_analysis': llm_analysis,
            'key_metrics': self._extract_key_metrics(financial_data)
        }
        
    def _calculate_ratios(self, financial_data: Dict) -> Dict:
        """计算财务比率"""
        return {
            'pe_ratio': financial_data.get('pe_ratio'),
            'pb_ratio': financial_data.get('pb_ratio'),
            'roe': financial_data.get('roe'),
            'debt_ratio': financial_data.get('total_liabilities', 0) / financial_data.get('total_assets', 1),
            'profit_margin': financial_data.get('net_income', 0) / financial_data.get('revenue', 1)
        }
        
    def _calculate_fundamental_score(self, ratios: Dict) -> int:
        """计算基本面评分"""
        score = 50  # 基础分数
        
        # P/E比率评分
        pe = ratios.get('pe_ratio')
        if pe and 10 <= pe <= 20:
            score += 15
        elif pe and 5 <= pe < 10:
            score += 10
        elif pe and pe > 30:
            score -= 10
            
        # ROE评分
        roe = ratios.get('roe')
        if roe and roe > 0.15:
            score += 15
        elif roe and roe > 0.10:
            score += 10
        elif roe and roe < 0.05:
            score -= 15
            
        # 债务比率评分
        debt_ratio = ratios.get('debt_ratio')
        if debt_ratio and debt_ratio < 0.3:
            score += 10
        elif debt_ratio and debt_ratio > 0.7:
            score -= 15
            
        return max(0, min(100, score))
        
    def _extract_key_metrics(self, financial_data: Dict) -> Dict:
        """提取关键指标"""
        return {
            'revenue_growth': 0.15,  # 这里应该计算实际增长率
            'profit_growth': 0.20,
            'asset_turnover': financial_data.get('revenue', 0) / financial_data.get('total_assets', 1)
        }

# ================================
# 技术分析Agent
# ================================

class TechnicalAnalysisAgent(BaseInvestmentAgent):
    def __init__(self):
        super().__init__("TechnicalAnalyst")
        
    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        price_data = task_data.get('price_data', {})
        stock_code = task_data.get('stock_code')
        
        if not price_data.get('price_history'):
            return {'error': 'No price history provided'}
            
        # 转换为pandas DataFrame进行技术分析
        df = pd.DataFrame(price_data['price_history'])
        
        # 计算技术指标
        indicators = self._calculate_technical_indicators(df)
        
        # 识别趋势和模式
        patterns = self._identify_patterns(df)
        
        # 生成技术分析报告
        technical_score = self._calculate_technical_score(indicators, patterns)
        
        return {
            'technical_score': technical_score,
            'indicators': indicators,
            'patterns': patterns,
            'trend': self._determine_trend(df),
            'support_resistance': self._find_support_resistance(df)
        }
        
    def _calculate_technical_indicators(self, df: pd.DataFrame) -> Dict:
        """计算技术指标"""
        if len(df) < 20:
            return {}
            
        # 移动平均线
        df['ma_5'] = df['close'].rolling(window=5).mean()
        df['ma_20'] = df['close'].rolling(window=20).mean()
        
        # RSI
        delta = df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        # MACD
        ema_12 = df['close'].ewm(span=12).mean()
        ema_26 = df['close'].ewm(span=26).mean()
        macd = ema_12 - ema_26
        macd_signal = macd.ewm(span=9).mean()
        
        return {
            'ma_5': df['ma_5'].iloc[-1] if not df['ma_5'].empty else None,
            'ma_20': df['ma_20'].iloc[-1] if not df['ma_20'].empty else None,
            'rsi': rsi.iloc[-1] if not rsi.empty else None,
            'macd': macd.iloc[-1] if not macd.empty else None,
            'macd_signal': macd_signal.iloc[-1] if not macd_signal.empty else None
        }
        
    def _identify_patterns(self, df: pd.DataFrame) -> Dict:
        """识别技术模式"""
        # 简化的模式识别
        patterns = []
        
        if len(df) >= 3:
            recent_high = df['high'].tail(10).max()
            recent_low = df['low'].tail(10).min()
            current_price = df['close'].iloc[-1]
            
            if current_price > recent_high * 0.95:
                patterns.append('approaching_resistance')
            elif current_price < recent_low * 1.05:
                patterns.append('approaching_support')
                
        return {'patterns': patterns}
        
    def _calculate_technical_score(self, indicators: Dict, patterns: Dict) -> int:
        """计算技术分析评分"""
        score = 50
        
        # RSI评分
        rsi = indicators.get('rsi')
        if rsi:
            if 30 <= rsi <= 70:
                score += 10
            elif rsi < 30:
                score += 20  # 超卖，可能反弹
            elif rsi > 70:
                score -= 20  # 超买，可能调整
                
        # 移动平均线评分
        ma_5 = indicators.get('ma_5')
        ma_20 = indicators.get('ma_20')
        if ma_5 and ma_20:
            if ma_5 > ma_20:
                score += 15  # 短期趋势向上
            else:
                score -= 15  # 短期趋势向下
                
        # MACD评分
        macd = indicators.get('macd')
        macd_signal = indicators.get('macd_signal')
        if macd and macd_signal:
            if macd > macd_signal:
                score += 10
            else:
                score -= 10
                
        return max(0, min(100, score))
        
    def _determine_trend(self, df: pd.DataFrame) -> str:
        """确定趋势方向"""
        if len(df) < 20:
            return 'unknown'
            
        recent_prices = df['close'].tail(20)
        if recent_prices.is_monotonic_increasing:
            return 'bullish'
        elif recent_prices.is_monotonic_decreasing:
            return 'bearish'
        else:
            return 'sideways'
            
    def _find_support_resistance(self, df: pd.DataFrame) -> Dict:
        """寻找支撑阻力位"""
        if len(df) < 10:
            return {}
            
        recent_data = df.tail(50)
        support = recent_data['low'].min()
        resistance = recent_data['high'].max()
        
        return {
            'support': support,
            'resistance': resistance
        }

# ================================
# 情感分析Agent
# ================================

class SentimentAnalysisAgent(BaseInvestmentAgent):
    def __init__(self):
        super().__init__("SentimentAnalyst")
        
    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        news_data = task_data.get('news_data', [])
        stock_code = task_data.get('stock_code')
        
        if not news_data:
            return {'sentiment_score': 50, 'analysis': 'No news data available'}
            
        # 分析新闻情感
        sentiment_scores = []
        positive_count = 0
        negative_count = 0
        neutral_count = 0
        
        for news in news_data:
            sentiment = self._analyze_sentiment(news['content'])
            sentiment_scores.append(sentiment)
            
            if sentiment > 0.1:
                positive_count += 1
            elif sentiment < -0.1:
                negative_count += 1
            else:
                neutral_count += 1
                
        # 计算总体情感分数
        avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
        sentiment_score = int((avg_sentiment + 1) * 50)  # 转换到0-100范围
        
        return {
            'sentiment_score': sentiment_score,
            'positive_ratio': positive_count / len(news_data),
            'negative_ratio': negative_count / len(news_data),
            'neutral_ratio': neutral_count / len(news_data),
            'news_count': len(news_data),
            'key_themes': self._extract_themes(news_data)
        }
        
    def _analyze_sentiment(self, text: str) -> float:
        """分析文本情感，返回-1到1的分数"""
        # 简化的情感分析，实际应该使用专业的NLP模型
        positive_words = ['增长', '上涨', '盈利', '成功', '优秀', '突破']
        negative_words = ['下跌', '亏损', '风险', '困难', '衰退', '问题']
        
        positive_count = sum(1 for word in positive_words if word in text)
        negative_count = sum(1 for word in negative_words if word in text)
        
        if positive_count + negative_count == 0:
            return 0
            
        return (positive_count - negative_count) / (positive_count + negative_count)
        
    def _extract_themes(self, news_data: List[Dict]) -> List[str]:
        """提取新闻主题"""
        # 简化的主题提取
        themes = set()
        for news in news_data:
            if '财报' in news['title'] or '业绩' in news['title']:
                themes.add('财务业绩')
            if '合作' in news['title'] or '协议' in news['title']:
                themes.add('业务合作')
            if '产品' in news['title'] or '技术' in news['title']:
                themes.add('产品技术')
                
        return list(themes)

# ================================
# 投资策略Agent
# ================================

class StrategyGenerationAgent(BaseInvestmentAgent):
    def __init__(self):
        super().__init__("StrategyGenerator")
        
    async def execute(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        analysis_results = task_data.get('analysis_results', {})
        user_profile = task_data.get('user_profile', {})
        stock_code = task_data.get('stock_code')
        
        # 综合分析结果
        fundamental_score = analysis_results.get('fundamental', {}).get('fundamental_score', 50)
        technical_score = analysis_results.get('technical', {}).get('technical_score', 50)
        sentiment_score = analysis_results.get('sentiment', {}).get('sentiment_score', 50)
        
        # 计算综合评分
        overall_score = self._calculate_overall_score(
            fundamental_score, technical_score, sentiment_score, user_profile
        )
        
        # 生成投资建议
        recommendation = self._generate_recommendation(
            overall_score, analysis_results, user_profile
        )
        
        # 计算目标价格和止损价格
        target_price, stop_loss = self._calculate_price_targets(
            analysis_results, recommendation
        )
        
        return {
            'overall_score': overall_score,
            'recommendation': recommendation['action'],
            'confidence': recommendation['confidence'],
            'target_price': target_price,
            'stop_loss': stop_loss,
            'reasoning': recommendation['reasoning'],
            'holding_period': recommendation.get('holding_period', '3-6个月'),
            'risk_level': self._assess_risk_level(analysis_results, user_profile)
        }
        
    def _calculate_overall_score(self, fundamental: int, technical: int, 
                               sentiment: int, user_profile: Dict) -> int:
        """计算综合评分"""
        # 根据用户偏好调整权重
        risk_level = user_profile.get('risk_level', 'medium')
        
        if risk_level == 'conservative':
            # 保守型投资者更重视基本面
            weights = {'fundamental': 0.5, 'technical': 0.3, 'sentiment': 0.2}
        elif risk_level == 'aggressive':
            # 激进型投资者更重视技术面和情感面
            weights = {'fundamental': 0.3, 'technical': 0.4, 'sentiment': 0.3}
        else:
            # 平衡型
            weights = {'fundamental': 0.4, 'technical': 0.4, 'sentiment': 0.2}
            
        overall_score = (
            fundamental * weights['fundamental'] +
            technical * weights['technical'] +
            sentiment * weights['sentiment']
        )
        
        return int(overall_score)
        
    def _generate_recommendation(self, overall_score: int, analysis_results: Dict, 
                               user_profile: Dict) -> Dict:
        """生成投资建议"""
        risk_level = user_profile.get('risk_level', 'medium')
        
        # 基于评分生成建议
        if overall_score >= 75:
            action = 'buy'
            confidence = 0.8 + (overall_score - 75) * 0.008
        elif overall_score >= 60:
            action = 'buy' if risk_level == 'aggressive' else 'hold'
            confidence = 0.6 + (overall_score - 60) * 0.01
        elif overall_score >= 40:
            action = 'hold'
            confidence = 0.5 + (overall_score - 40) * 0.005
        elif overall_score >= 25:
            action = 'sell' if risk_level != 'conservative' else 'hold'
            confidence = 0.6 + (40 - overall_score) * 0.01
        else:
            action = 'sell'
            confidence = 0.8 + (25 - overall_score) * 0.008
            
        # 生成推理说明
        reasoning_parts = []
        
        fundamental = analysis_results.get('fundamental', {})
        if fundamental.get('fundamental_score', 50) > 70:
            reasoning_parts.append("基本面表现强劲")
        elif fundamental.get('fundamental_score', 50) < 30:
            reasoning_parts.append("基本面存在风险")
            
        technical = analysis_results.get('technical', {})
        if technical.get('technical_score', 50) > 70:
            reasoning_parts.append("技术面呈现上涨趋势")
        elif technical.get('technical_score', 50) < 30:
            reasoning_parts.append("技术面显示下跌压力")
            
        reasoning = f"综合评分{overall_score}分。" + "，".join(reasoning_parts)
        
        return {
            'action': action,
            'confidence': min(0.95, confidence),
            'reasoning': reasoning,
            'holding_period': '3-6个月' if action == 'buy' else '1-3个月'
        }
        
    def _calculate_price_targets(self, analysis_results: Dict, recommendation: Dict) -> tuple:
        """计算目标价格和止损价格"""
        # 这里应该基于分析结果计算，暂时返回示例值
        current_price = 10.0  # 应该从price_data中获取
        
        if recommendation['action'] == 'buy':
            target_price = current_price * 1.15  # 15%上涨目标
            stop_loss = current_price * 0.90     # 10%止损
        elif recommendation['action'] == 'sell':
            target_price = current_price * 0.85  # 预期下跌15%
            stop_loss = current_price * 1.05     # 5%止损（做空）
        else:
            target_price = current_price
            stop_loss = current_price * 0.95     # 5%止损
            
        return round(target_price, 2), round(stop_loss, 2)
        
    def _assess_risk_level(self, analysis_results: Dict, user_profile: Dict) -> str:
        """评估投资风险等级"""
        # 基于波动率、财务稳定性等因素评估风险
        return user_profile.get('risk_level', 'medium')

# ================================
# Agent编排器
# ================================

class InvestmentAnalysisOrchestrator:
    def __init__(self):
        self.agents = {
            'data_collector': DataCollectionAgent(),
            'fundamental_analyst': FundamentalAnalysisAgent(),
            'technical_analyst': TechnicalAnalysisAgent(),
            'sentiment_analyst': SentimentAnalysisAgent(),
            'strategy_generator': StrategyGenerationAgent()
        }
        
    async def analyze_stock(self, stock_code: str, user_profile: Dict) -> AnalysisResult:
        """执行完整的股票分析流程"""
        try:
            # 1. 数据收集
            data_result = await self.agents['data_collector'].execute({
                'stock_code': stock_code,
                'data_types': ['price', 'financial', 'news']
            })
            
            if 'error' in data_result:
                raise ValueError(f"数据收集失败: {data_result['error']}")
                
            # 2. 并行执行分析
            analysis_tasks = [
                self.agents['fundamental_analyst'].execute({
                    'stock_code': stock_code,
                    **data_result
                }),
                self.agents['technical_analyst'].execute({
                    'stock_code': stock_code,
                    **data_result
                }),
                self.agents['sentiment_analyst'].execute({
                    'stock_code': stock_code,
                    **data_result
                })
            ]
            
            fundamental_result, technical_result, sentiment_result = await asyncio.gather(
                *analysis_tasks
            )
            
            # 3. 策略生成
            strategy_result = await self.agents['strategy_generator'].execute({
                'stock_code': stock_code,
                'analysis_results': {
                    'fundamental': fundamental_result,
                    'technical': technical_result,
                    'sentiment': sentiment_result
                },
                'user_profile': user_profile
            })
            
            # 4. 构造最终结果
            analysis_result = AnalysisResult(
                stock_code=stock_code,
                fundamental_score=fundamental_result.get('fundamental_score', 50),
                technical_score=technical_result.get('technical_score', 50),
                sentiment_score=sentiment_result.get('sentiment_score', 50),
                overall_score=strategy_result.get('overall_score', 50),
                recommendation=strategy_result.get('recommendation', 'hold'),
                confidence=strategy_result.get('confidence', 0.5),
                target_price=strategy_result.get('target_price'),
                stop_loss=strategy_result.get('stop_loss'),
                reasoning=strategy_result.get('reasoning', '')
            )
            
            return analysis_result
            
        except Exception as e:
            raise HTTPException(status_code=500, f"分析过程出错: {str(e)}")

# ================================
# FastAPI应用
# ================================

app = FastAPI(title="InvestAI API", version="1.0.0")
orchestrator = InvestmentAnalysisOrchestrator()

class AnalysisRequest(BaseModel):
    stock_code: str
    user_profile: Dict = {}

class AnalysisResponse(BaseModel):
    success: bool
    data: Dict[str, Any]
    message: str

@app.post("/api/v1/analysis/stock", response_model=AnalysisResponse)
async def analyze_stock(request: AnalysisRequest):
    """分析单只股票"""
    try:
        result = await orchestrator.analyze_stock(
            request.stock_code, 
            request.user_profile
        )
        
        return AnalysisResponse(
            success=True,
            data=result.__dict__,
            message="分析完成"
        )
    except Exception as e:
        return AnalysisResponse(
            success=False,
            data={},
            message=str(e)
        )

@app.get("/api/v1/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# ================================
# 使用示例
# ================================

async def main():
    """使用示例"""
    orchestrator = InvestmentAnalysisOrchestrator()
    
    # 分析股票
    user_profile = {
        'risk_level': 'medium',
        'investment_horizon': 'long_term',
        'experience_level': 'intermediate'
    }
    
    result = await orchestrator.analyze_stock('000001', user_profile)
    
    print(f"股票代码: {result.stock_code}")
    print(f"综合评分: {result.overall_score}")
    print(f"投资建议: {result.recommendation}")
    print(f"置信度: {result.confidence:.2f}")
    print(f"目标价格: {result.target_price}")
    print(f"止损价格: {result.stop_loss}")
    print(f"分析reasoning: {result.reasoning}")

if __name__ == "__main__":
    import uvicorn
    
    # 开发环境运行
    # asyncio.run(main())
    
    # 生产环境运行
    uvicorn.run(app, host="0.0.0.0", port=8000)