"""
策略生成Agent - 负责综合分析结果并生成投资策略
"""
from typing import Dict, List, Any, Optional
from datetime import datetime
from loguru import logger

from app.agents.base import BaseAgent, AgentTask, AgentResult


class StrategyGenerationAgent(BaseAgent):
    """策略生成Agent"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("strategy_generator", config)
        # 策略权重配置
        self.strategy_weights = {
            'fundamental': 0.35,
            'technical': 0.30,
            'sentiment': 0.20,
            'risk_profile': 0.15
        }
        # 风险偏好映射
        self.risk_profile_mapping = {
            'conservative': {'max_position': 0.05, 'stop_loss': 0.08, 'target_gain': 0.15},
            'moderate': {'max_position': 0.10, 'stop_loss': 0.12, 'target_gain': 0.25},
            'aggressive': {'max_position': 0.20, 'stop_loss': 0.15, 'target_gain': 0.35}
        }
    
    async def execute(self, task: AgentTask) -> AgentResult:
        """执行策略生成任务"""
        start_time = datetime.now()
        
        try:
            analysis_results = task.input_data.get('analysis_results', {})
            stock_code = task.input_data.get('stock_code', 'Unknown')
            user_risk_profile = task.input_data.get('risk_profile', 'moderate')
            current_price = task.input_data.get('current_price')
            
            if not analysis_results or not current_price:
                return AgentResult(
                    task_id=task.task_id,
                    success=False,
                    data={},
                    error_msg="Missing required analysis results or current price"
                )
            
            # 计算综合投资评分
            investment_score = self._calculate_investment_score(analysis_results, user_risk_profile)
            
            # 生成投资建议
            recommendation = self._generate_recommendation(investment_score)
            
            # 计算目标价格和止损价格
            price_targets = self._calculate_price_targets(
                current_price, investment_score, user_risk_profile
            )
            
            # 生成仓位建议
            position_sizing = self._calculate_position_sizing(
                investment_score, user_risk_profile, current_price
            )
            
            # 生成详细分析报告
            analysis_report = self._generate_analysis_report(
                stock_code, analysis_results, investment_score, 
                recommendation, price_targets, position_sizing
            )
            
            result_data = {
                'investment_score': investment_score,
                'recommendation': recommendation,
                'price_targets': price_targets,
                'position_sizing': position_sizing,
                'analysis_report': analysis_report,
                'timestamp': datetime.now().isoformat()
            }
            
            return AgentResult(
                task_id=task.task_id,
                success=True,
                data=result_data,
                execution_time=(datetime.now() - start_time).total_seconds()
            )
            
        except Exception as e:
            logger.error(f"Strategy generation failed: {e}")
            return AgentResult(
                task_id=task.task_id,
                success=False,
                data={},
                error_msg=str(e),
                execution_time=(datetime.now() - start_time).total_seconds()
            )
    
    def _calculate_investment_score(self, analysis_results: Dict[str, Any], 
                                  risk_profile: str) -> int:
        """计算综合投资评分"""
        scores = {}
        weights = self.strategy_weights
        
        # 提取各分析模块的分数
        if 'fundamental' in analysis_results:
            scores['fundamental'] = analysis_results['fundamental'].get('fundamental_score', 50)
        if 'technical' in analysis_results:
            scores['technical'] = analysis_results['technical'].get('technical_score', 50)
        if 'sentiment' in analysis_results:
            scores['sentiment'] = analysis_results['sentiment'].get('sentiment_score', 50)
        
        # 风险偏好分数（基于风险偏好配置）
        risk_config = self.risk_profile_mapping.get(risk_profile, self.risk_profile_mapping['moderate'])
        risk_score = 60 if risk_profile == 'moderate' else (50 if risk_profile == 'conservative' else 70)
        scores['risk_profile'] = risk_score
        
        # 计算加权平均分数
        total_score = 0
        total_weight = 0
        
        for factor, weight in weights.items():
            if factor in scores:
                total_score += scores[factor] * weight
                total_weight += weight
        
        if total_weight == 0:
            return 50
        
        return min(100, max(0, int(total_score / total_weight)))
    
    def _generate_recommendation(self, investment_score: int) -> Dict[str, Any]:
        """生成投资建议"""
        if investment_score >= 80:
            return {
                'action': 'strong_buy',
                'confidence': 'high',
                'description': '强烈买入 - 综合评分优秀，投资机会突出'
            }
        elif investment_score >= 70:
            return {
                'action': 'buy',
                'confidence': 'medium',
                'description': '建议买入 - 综合评分良好，具备投资价值'
            }
        elif investment_score >= 60:
            return {
                'action': 'hold',
                'confidence': 'medium',
                'description': '持有观望 - 综合评分中等，建议保持现有仓位'
            }
        elif investment_score >= 50:
            return {
                'action': 'reduce',
                'confidence': 'low',
                'description': '减仓观望 - 综合评分偏低，建议降低仓位'
            }
        else:
            return {
                'action': 'sell',
                'confidence': 'high',
                'description': '建议卖出 - 综合评分较差，存在明显风险'
            }
    
    def _calculate_price_targets(self, current_price: float, investment_score: int, 
                               risk_profile: str) -> Dict[str, float]:
        """计算目标价格和止损价格"""
        risk_config = self.risk_profile_mapping.get(risk_profile, self.risk_profile_mapping['moderate'])
        
        # 基于投资评分计算目标收益率
        if investment_score >= 80:
            target_return = risk_config['target_gain'] * 1.2
        elif investment_score >= 70:
            target_return = risk_config['target_gain'] * 1.0
        elif investment_score >= 60:
            target_return = risk_config['target_gain'] * 0.8
        elif investment_score >= 50:
            target_return = risk_config['target_gain'] * 0.5
        else:
            target_return = risk_config['target_gain'] * 0.3
        
        target_price = current_price * (1 + target_return)
        stop_loss_price = current_price * (1 - risk_config['stop_loss'])
        
        return {
            'target_price': round(target_price, 2),
            'stop_loss': round(stop_loss_price, 2),
            'upside_potential': round((target_price - current_price) / current_price * 100, 1),
            'downside_risk': round((current_price - stop_loss_price) / current_price * 100, 1)
        }
    
    def _calculate_position_sizing(self, investment_score: int, risk_profile: str, 
                                 current_price: float) -> Dict[str, Any]:
        """计算仓位建议"""
        risk_config = self.risk_profile_mapping.get(risk_profile, self.risk_profile_mapping['moderate'])
        
        # 基于投资评分调整最大仓位
        max_position = risk_config['max_position']
        if investment_score >= 80:
            position_size = max_position * 1.2
        elif investment_score >= 70:
            position_size = max_position * 1.0
        elif investment_score >= 60:
            position_size = max_position * 0.8
        elif investment_score >= 50:
            position_size = max_position * 0.5
        else:
            position_size = max_position * 0.3
        
        # 限制仓位范围
        position_size = max(0.01, min(position_size, 0.3))
        
        return {
            'position_size_percent': round(position_size * 100, 1),
            'max_position_percent': round(max_position * 100, 1),
            'risk_level': risk_profile,
            'suggestion': f'建议仓位: {round(position_size * 100, 1)}% 总投资资金'
        }
    
    def _generate_analysis_report(self, stock_code: str, analysis_results: Dict[str, Any], 
                                investment_score: int, recommendation: Dict[str, Any],
                                price_targets: Dict[str, float], position_sizing: Dict[str, Any]) -> str:
        """生成详细分析报告"""
        report_parts = [f"股票 {stock_code} 投资策略报告\n"]
        report_parts.append(f"综合投资评分: {investment_score}/100\n")
        
        # 投资建议
        report_parts.append(f"投资建议: {recommendation['action']} ({recommendation['confidence']})")
        report_parts.append(f"建议说明: {recommendation['description']}\n")
        
        # 价格目标
        report_parts.append("价格目标:")
        report_parts.append(f"- 目标价格: {price_targets['target_price']} (+{price_targets['upside_potential']}%)")
        report_parts.append(f"- 止损价格: {price_targets['stop_loss']} (-{price_targets['downside_risk']}%)")
        report_parts.append(f"- 当前价格: {analysis_results.get('price_data', {}).get('current_price', 'N/A')}\n")
        
        # 仓位建议
        report_parts.append("仓位管理:")
        report_parts.append(f"- 建议仓位: {position_sizing['position_size_percent']}%")
        report_parts.append(f"- 最大仓位: {position_sizing['max_position_percent']}%")
        report_parts.append(f"- 风险等级: {position_sizing['risk_level']}\n")
        
        # 各分析模块评分
        report_parts.append("分析模块评分:")
        if 'fundamental' in analysis_results:
            score = analysis_results['fundamental'].get('fundamental_score', 'N/A')
            report_parts.append(f"- 基本面分析: {score}/100")
        if 'technical' in analysis_results:
            score = analysis_results['technical'].get('technical_score', 'N/A')
            report_parts.append(f"- 技术分析: {score}/100")
        if 'sentiment' in analysis_results:
            score = analysis_results['sentiment'].get('sentiment_score', 'N/A')
            report_parts.append(f"- 情感分析: {score}/100\n")
        
        # 风险提示
        report_parts.append("风险提示:")
        report_parts.append("- 股市有风险，投资需谨慎")
        report_parts.append("- 本分析仅供参考，不构成投资建议")
        report_parts.append("- 请根据自身风险承受能力做出投资决策")
        
        return '\n'.join(report_parts)


# 使用示例
async def test_strategy_generation():
    """测试策略生成Agent"""
    config = {}
    agent = StrategyGenerationAgent(config)
    
    # 模拟分析结果
    analysis_results = {
        'fundamental': {'fundamental_score': 75},
        'technical': {'technical_score': 82},
        'sentiment': {'sentiment_score': 68},
        'price_data': {'current_price': 320.5}
    }
    
    task = AgentTask(
        task_id="test_strategy_001",
        task_type="strategy_generation",
        input_data={
            'stock_code': '00700',
            'analysis_results': analysis_results,
            'risk_profile': 'moderate',
            'current_price': 320.5
        }
    )
    
    result = await agent.execute(task)
    print(f"Success: {result.success}")
    print(f"Investment Score: {result.data.get('investment_score')}")
    print(f"Recommendation: {result.data.get('recommendation')}")
    print(f"Analysis Report:\n{result.data.get('analysis_report')}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_strategy_generation())