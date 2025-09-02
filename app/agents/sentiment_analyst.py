"""
情感分析Agent - 负责分析市场情绪和新闻情感
"""
from typing import Dict, List, Any, Optional
from datetime import datetime
import re
from collections import Counter
import aiohttp
from loguru import logger

from app.agents.base import BaseAgent, AgentTask, AgentResult


class SentimentAnalysisAgent(BaseAgent):
    """情感分析Agent"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("sentiment_analyst", config)
        self.positive_words = self._load_sentiment_words('positive')
        self.negative_words = self._load_sentiment_words('negative')
        self.intensity_modifiers = self._load_intensity_modifiers()
        self.session = None
    
    def _load_sentiment_words(self, sentiment_type: str) -> set:
        """加载情感词汇"""
        # 这里可以扩展为从文件或数据库加载
        if sentiment_type == 'positive':
            return {
                '增长', '上涨', '盈利', '成功', '优秀', '突破', '利好', '看好', '推荐',
                '买入', '持有', '超预期', '创新高', '大涨', '飙升', '强劲', '稳健',
                '潜力', '机会', '优势', '领先', '突破', '复苏', '改善', '提升'
            }
        else:  # negative
            return {
                '下跌', '亏损', '风险', '困难', '衰退', '问题', '利空', '看空', '减持',
                '卖出', '警告', '担忧', '下跌', '暴跌', '崩盘', '危机', '困难',
                '挑战', '压力', '下滑', '减少', '恶化', '损失', '争议', '调查'
            }
    
    def _load_intensity_modifiers(self) -> Dict[str, float]:
        """加载强度修饰词"""
        return {
            '非常': 1.5, '极其': 1.5, '特别': 1.3, '十分': 1.3, '相当': 1.2,
            '比较': 0.8, '稍微': 0.7, '有点': 0.7, '略微': 0.6, '轻微': 0.6
        }
    
    async def initialize(self):
        """初始化Agent"""
        self.session = aiohttp.ClientSession()
        logger.info("SentimentAnalysisAgent initialized")
    
    async def execute(self, task: AgentTask) -> AgentResult:
        """执行情感分析任务"""
        start_time = datetime.now()
        
        try:
            news_data = task.input_data.get('news_data', [])
            stock_code = task.input_data.get('stock_code', 'Unknown')
            
            if not news_data:
                # 如果没有提供新闻数据，尝试从网络获取
                news_data = await self._fetch_news_data(stock_code)
            
            if not news_data:
                return AgentResult(
                    task_id=task.task_id,
                    success=False,
                    data={},
                    error_msg="No news data available for sentiment analysis"
                )
            
            # 分析新闻情感
            sentiment_results = await self._analyze_news_sentiment(news_data)
            
            # 计算总体情感分数
            sentiment_score = self._calculate_overall_sentiment(sentiment_results)
            
            # 提取关键主题
            key_themes = self._extract_key_themes(news_data)
            
            # 生成情感分析报告
            analysis_report = self._generate_analysis_report(
                stock_code, sentiment_results, sentiment_score, key_themes
            )
            
            result_data = {
                'sentiment_score': sentiment_score,
                'sentiment_results': sentiment_results,
                'key_themes': key_themes,
                'analysis_report': analysis_report,
                'news_count': len(news_data),
                'timestamp': datetime.now().isoformat()
            }
            
            return AgentResult(
                task_id=task.task_id,
                success=True,
                data=result_data,
                execution_time=(datetime.now() - start_time).total_seconds()
            )
            
        except Exception as e:
            logger.error(f"Sentiment analysis failed: {e}")
            return AgentResult(
                task_id=task.task_id,
                success=False,
                data={},
                error_msg=str(e),
                execution_time=(datetime.now() - start_time).total_seconds()
            )
    
    async def _fetch_news_data(self, stock_code: str) -> List[Dict[str, Any]]:
        """从网络获取新闻数据"""
        try:
            # 这里可以集成真实的新闻API
            # 例如: News API, 百度新闻, 新浪财经等
            
            # 模拟网络请求
            await asyncio.sleep(0.2)
            
            # 返回模拟数据
            return [
                {
                    'title': f'{stock_code}发布Q3财报，业绩超预期',
                    'content': '公司第三季度营收同比增长20%，净利润增长25%，超出市场预期。',
                    'source': '新浪财经',
                    'published_at': '2024-01-15T10:00:00Z',
                    'url': 'https://example.com/news/1'
                },
                {
                    'title': f'{stock_code}游戏业务持续增长，股价创新高',
                    'content': '公司游戏业务表现强劲，多款新游戏上线获得用户好评，推动股价上涨。',
                    'source': '东方财富',
                    'published_at': '2024-01-14T15:30:00Z',
                    'url': 'https://example.com/news/2'
                },
                {
                    'title': '监管政策影响，科技股面临调整压力',
                    'content': '近期监管政策收紧，科技股整体面临调整压力，投资者需要保持谨慎。',
                    'source': '华尔街见闻',
                    'published_at': '2024-01-13T09:15:00Z',
                    'url': 'https://example.com/news/3'
                }
            ]
            
        except Exception as e:
            logger.warning(f"Failed to fetch news data: {e}")
            return []
    
    async def _analyze_news_sentiment(self, news_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """分析新闻情感"""
        results = []
        
        for news in news_data:
            try:
                # 分析标题情感
                title_sentiment = self._analyze_text_sentiment(news.get('title', ''))
                
                # 分析内容情感
                content_sentiment = self._analyze_text_sentiment(news.get('content', ''))
                
                # 综合情感分数
                overall_sentiment = (title_sentiment['score'] * 0.6 + 
                                   content_sentiment['score'] * 0.4)
                
                # 确定情感方向
                if overall_sentiment > 0.1:
                    sentiment = 'positive'
                elif overall_sentiment < -0.1:
                    sentiment = 'negative'
                else:
                    sentiment = 'neutral'
                
                results.append({
                    'title': news.get('title'),
                    'source': news.get('source'),
                    'published_at': news.get('published_at'),
                    'title_sentiment': title_sentiment,
                    'content_sentiment': content_sentiment,
                    'overall_sentiment': {
                        'score': round(overall_sentiment, 3),
                        'direction': sentiment,
                        'intensity': abs(overall_sentiment)
                    },
                    'url': news.get('url')
                })
                
            except Exception as e:
                logger.warning(f"Failed to analyze news sentiment: {e}")
                continue
        
        return results
    
    def _analyze_text_sentiment(self, text: str) -> Dict[str, Any]:
        """分析文本情感"""
        if not text:
            return {'score': 0, 'positive_words': [], 'negative_words': []}
        
        # 分词（简单版本）
        words = re.findall(r'[\w\u4e00-\u9fff]+', text.lower())
        
        positive_found = []
        negative_found = []
        total_score = 0
        
        # 检查每个词的情感
        for i, word in enumerate(words):
            intensity = 1.0
            
            # 检查强度修饰词
            if i > 0 and words[i-1] in self.intensity_modifiers:
                intensity = self.intensity_modifiers[words[i-1]]
            
            if word in self.positive_words:
                positive_found.append(word)
                total_score += 1 * intensity
            elif word in self.negative_words:
                negative_found.append(word)
                total_score -= 1 * intensity
        
        # 归一化分数到-1到1范围
        word_count = len(words)
        if word_count > 0:
            normalized_score = total_score / min(word_count, 10)  # 防止长文本分数过高
        else:
            normalized_score = 0
        
        # 限制分数范围
        normalized_score = max(-1, min(1, normalized_score))
        
        return {
            'score': round(normalized_score, 3),
            'positive_words': list(set(positive_found)),
            'negative_words': list(set(negative_found)),
            'word_count': word_count
        }
    
    def _calculate_overall_sentiment(self, sentiment_results: List[Dict[str, Any]]) -> int:
        """计算总体情感分数"""
        if not sentiment_results:
            return 50  # 中性
        
        total_score = 0
        valid_count = 0
        
        for result in sentiment_results:
            sentiment = result['overall_sentiment']
            if sentiment['score'] != 0:  # 排除中性新闻
                total_score += sentiment['score']
                valid_count += 1
        
        if valid_count == 0:
            return 50
        
        # 平均分数并转换到0-100范围
        avg_score = total_score / valid_count
        sentiment_score = int((avg_score + 1) * 50)  # -1到1 -> 0到100
        
        return max(0, min(100, sentiment_score))
    
    def _extract_key_themes(self, news_data: List[Dict[str, Any]]) -> List[str]:
        """提取关键主题"""
        themes = set()
        
        # 主题关键词映射
        theme_keywords = {
            '财务业绩': ['财报', '业绩', '营收', '利润', '盈利', '收入'],
            '业务合作': ['合作', '协议', '签约', '战略', '伙伴'],
            '产品技术': ['产品', '技术', '研发', '创新', '发布', '上线'],
            '市场表现': ['股价', '市值', '交易', '涨跌', '波动'],
            '监管政策': ['监管', '政策', '法规', '合规', '审查'],
            '行业动态': ['行业', '市场', '竞争', '趋势', '发展']
        }
        
        for news in news_data:
            text = f"{news.get('title', '')} {news.get('content', '')}".lower()
            
            for theme, keywords in theme_keywords.items():
                if any(keyword in text for keyword in keywords):
                    themes.add(theme)
        
        return sorted(list(themes))
    
    def _generate_analysis_report(self, stock_code: str, sentiment_results: List[Dict[str, Any]], 
                                sentiment_score: int, key_themes: List[str]) -> str:
        """生成情感分析报告"""
        report_parts = [f"股票 {stock_code} 情感分析报告\n"]
        report_parts.append(f"情感评分: {sentiment_score}/100\n")
        
        # 情感分布
        positive_count = sum(1 for r in sentiment_results 
                           if r['overall_sentiment']['direction'] == 'positive')
        negative_count = sum(1 for r in sentiment_results 
                           if r['overall_sentiment']['direction'] == 'negative')
        neutral_count = len(sentiment_results) - positive_count - negative_count
        
        report_parts.append(f"情感分布: 正面 {positive_count}条, 负面 {negative_count}条, 中性 {neutral_count}条")
        
        # 关键主题
        if key_themes:
            report_parts.append(f"\n关键主题: {', '.join(key_themes)}")
        
        # 重要新闻摘要
        significant_news = []
        for news in sentiment_results:
            sentiment = news['overall_sentiment']
            if abs(sentiment['score']) > 0.3:  # 显著情感
                significance = "强烈正面" if sentiment['score'] > 0.3 else "强烈负面"
                significant_news.append(f"- {news['title']} ({significance})")
        
        if significant_news:
            report_parts.append("\n重要新闻:")
            report_parts.extend(significant_news[:3])  # 显示最重要的3条
        
        # 总体市场情绪
        if sentiment_score >= 70:
            mood = "积极乐观，市场情绪良好"
        elif sentiment_score >= 60:
            mood = "谨慎乐观，整体偏正面"
        elif sentiment_score >= 40:
            mood = "中性平衡，多空力量相当"
        elif sentiment_score >= 30:
            mood = "谨慎悲观，需要关注风险"
        else:
            mood = "消极悲观，市场情绪较差"
        
        report_parts.append(f"\n市场情绪: {mood}")
        
        # 投资建议
        if sentiment_score >= 70:
            suggestion = "市场情绪积极，有利于股价表现"
        elif sentiment_score >= 50:
            suggestion = "市场情绪中性，建议结合其他分析"
        else:
            suggestion = "市场情绪消极，需要谨慎操作"
        
        report_parts.append(f"投资建议: {suggestion}")
        
        return '\n'.join(report_parts)
    
    async def cleanup(self):
        """清理资源"""
        if self.session:
            await self.session.close()
            logger.info("SentimentAnalysisAgent cleaned up")


# 使用示例
async def test_sentiment_analysis():
    """测试情感分析Agent"""
    config = {}
    agent = SentimentAnalysisAgent(config)
    await agent.initialize()
    
    # 模拟新闻数据
    news_data = [
        {
            'title': '腾讯发布Q3财报，业绩超预期',
            'content': '腾讯控股发布第三季度财报，营收同比增长20%，净利润增长25%，超出市场预期。',
            'source': '新浪财经',
            'published_at': '2024-01-15T10:00:00Z'
        },
        {
            'title': '游戏业务持续增长，腾讯股价创新高',
            'content': '腾讯游戏业务表现强劲，多款新游戏上线获得用户好评，推动股价上涨。',
            'source': '东方财富',
            'published_at': '2024-01-14T15:30:00Z'
        },
        {
            'title': '监管政策影响，科技股面临调整',
            'content': '近期监管政策收紧，科技股整体面临调整压力，投资者需要保持谨慎。',
            'source': '华尔街见闻',
            'published_at': '2024-01-13T09:15:00Z'
        }
    ]
    
    task = AgentTask(
        task_id="test_sentiment_001",
        task_type="sentiment_analysis",
        input_data={
            'stock_code': '00700',
            'news_data': news_data
        }
    )
    
    result = await agent.execute(task)
    print(f"Success: {result.success}")
    print(f"Sentiment Score: {result.data.get('sentiment_score')}")
    print(f"Key Themes: {result.data.get('key_themes')}")
    print(f"Analysis Report:\n{result.data.get('analysis_report')}")
    
    await agent.cleanup()


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_sentiment_analysis())