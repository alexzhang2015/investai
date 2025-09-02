"""
基本面分析Agent - 负责分析公司财务数据和基本面指标
"""
from typing import Dict, Any, Optional
from datetime import datetime
from loguru import logger

from app.agents.base import BaseAgent, AgentTask, AgentResult


class FundamentalAnalysisAgent(BaseAgent):
    """基本面分析Agent"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("fundamental_analyst", config)
        # 财务比率的标准范围配置
        self.ratio_standards = {
            'pe_ratio': {'good': (10, 20), 'fair': (5, 30), 'poor': (0, 5) or (30, 100)},
            'pb_ratio': {'good': (0.8, 1.5), 'fair': (0.5, 2.0), 'poor': (0, 0.5) or (2.0, 10)},
            'roe': {'good': (0.15, 1.0), 'fair': (0.08, 0.15), 'poor': (0, 0.08)},
            'debt_ratio': {'good': (0, 0.4), 'fair': (0.4, 0.6), 'poor': (0.6, 1.0)},
            'profit_margin': {'good': (0.15, 1.0), 'fair': (0.08, 0.15), 'poor': (0, 0.08)},
            'current_ratio': {'good': (1.5, 3.0), 'fair': (1.0, 1.5), 'poor': (0, 1.0)}
        }
    
    async def execute(self, task: AgentTask) -> AgentResult:
        """执行基本面分析任务"""
        start_time = datetime.now()
        
        try:
            financial_data = task.input_data.get('financial_data', {})
            stock_code = task.input_data.get('stock_code', 'Unknown')
            
            if not financial_data:
                return AgentResult(
                    task_id=task.task_id,
                    success=False,
                    data={},
                    error_msg="No financial data provided"
                )
            
            # 计算财务比率
            ratios = self._calculate_financial_ratios(financial_data)
            
            # 评估每个比率
            ratio_assessments = self._assess_ratios(ratios)
            
            # 计算基本面评分
            fundamental_score = self._calculate_fundamental_score(ratio_assessments)
            
            # 提取关键指标
            key_metrics = self._extract_key_metrics(financial_data, ratios)
            
            # 生成分析报告
            analysis_report = self._generate_analysis_report(
                stock_code, ratios, ratio_assessments, fundamental_score
            )
            
            result_data = {
                'fundamental_score': fundamental_score,
                'financial_ratios': ratios,
                'ratio_assessments': ratio_assessments,
                'key_metrics': key_metrics,
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
            logger.error(f"Fundamental analysis failed: {e}")
            return AgentResult(
                task_id=task.task_id,
                success=False,
                data={},
                error_msg=str(e),
                execution_time=(datetime.now() - start_time).total_seconds()
            )
    
    def _calculate_financial_ratios(self, financial_data: Dict[str, Any]) -> Dict[str, float]:
        """计算财务比率"""
        ratios = {}
        
        # 基础比率
        ratios['pe_ratio'] = financial_data.get('pe_ratio')
        ratios['pb_ratio'] = financial_data.get('pb_ratio')
        ratios['roe'] = financial_data.get('roe')
        
        # 计算其他重要比率
        revenue = financial_data.get('revenue', 0)
        net_income = financial_data.get('net_income', 0)
        total_assets = financial_data.get('total_assets', 1)
        total_liabilities = financial_data.get('total_liabilities', 0)
        shareholders_equity = financial_data.get('shareholders_equity', 1)
        
        # 债务比率
        ratios['debt_ratio'] = total_liabilities / total_assets if total_assets > 0 else 0
        
        # 利润率
        ratios['profit_margin'] = net_income / revenue if revenue > 0 else 0
        
        # 资产回报率
        ratios['roa'] = net_income / total_assets if total_assets > 0 else 0
        
        # 权益乘数
        ratios['equity_multiplier'] = total_assets / shareholders_equity if shareholders_equity > 0 else 0
        
        # 运营效率
        ratios['asset_turnover'] = revenue / total_assets if total_assets > 0 else 0
        
        return {k: round(v, 4) if isinstance(v, float) else v for k, v in ratios.items()}
    
    def _assess_ratios(self, ratios: Dict[str, float]) -> Dict[str, Dict[str, Any]]:
        """评估财务比率"""
        assessments = {}
        
        for ratio_name, ratio_value in ratios.items():
            if ratio_value is None:
                assessments[ratio_name] = {
                    'value': None,
                    'assessment': 'unknown',
                    'score': 50,
                    'comment': '数据缺失'
                }
                continue
            
            standards = self.ratio_standards.get(ratio_name, {})
            assessment = 'fair'
            score = 50
            comment = ''
            
            if ratio_name in standards:
                good_range = standards['good']
                fair_range = standards['fair']
                poor_range = standards['poor']
                
                if good_range[0] <= ratio_value <= good_range[1]:
                    assessment = 'good'
                    score = 85
                    comment = f'{ratio_name.upper()}处于优秀范围'
                elif fair_range[0] <= ratio_value <= fair_range[1]:
                    assessment = 'fair'
                    score = 65
                    comment = f'{ratio_name.upper()}处于合理范围'
                elif (poor_range[0] <= ratio_value <= poor_range[1] if isinstance(poor_range, tuple) 
                      else ratio_value <= poor_range[0] or ratio_value >= poor_range[1]):
                    assessment = 'poor'
                    score = 30
                    comment = f'{ratio_name.upper()}需要关注'
            
            assessments[ratio_name] = {
                'value': ratio_value,
                'assessment': assessment,
                'score': score,
                'comment': comment
            }
        
        return assessments
    
    def _calculate_fundamental_score(self, assessments: Dict[str, Dict[str, Any]]) -> int:
        """计算基本面综合评分"""
        if not assessments:
            return 50
        
        # 权重配置
        weights = {
            'pe_ratio': 0.20,
            'pb_ratio': 0.15,
            'roe': 0.25,
            'debt_ratio': 0.20,
            'profit_margin': 0.15,
            'roa': 0.05
        }
        
        total_score = 0
        total_weight = 0
        
        for ratio_name, assessment in assessments.items():
            weight = weights.get(ratio_name, 0)
            if weight > 0 and assessment['value'] is not None:
                total_score += assessment['score'] * weight
                total_weight += weight
        
        if total_weight == 0:
            return 50
        
        return min(100, max(0, int(total_score / total_weight)))
    
    def _extract_key_metrics(self, financial_data: Dict[str, Any], ratios: Dict[str, float]) -> Dict[str, Any]:
        """提取关键指标"""
        return {
            'revenue_growth': self._calculate_growth_rate(financial_data.get('revenue')),
            'profit_growth': self._calculate_growth_rate(financial_data.get('net_income')),
            'asset_growth': self._calculate_growth_rate(financial_data.get('total_assets')),
            'equity_growth': self._calculate_growth_rate(financial_data.get('shareholders_equity')),
            'operating_cash_flow_growth': self._calculate_growth_rate(financial_data.get('operating_cash_flow')),
            'current_ratio': ratios.get('current_ratio'),
            'quick_ratio': ratios.get('quick_ratio'),
            'interest_coverage': ratios.get('interest_coverage')
        }
    
    def _calculate_growth_rate(self, current_value: float, previous_value: float = None) -> Optional[float]:
        """计算增长率"""
        if current_value is None or previous_value is None or previous_value == 0:
            return None
        return round((current_value - previous_value) / previous_value, 4)
    
    def _generate_analysis_report(self, stock_code: str, ratios: Dict[str, float], 
                                assessments: Dict[str, Dict[str, Any]], score: int) -> str:
        """生成分析报告"""
        report_parts = [f"股票 {stock_code} 基本面分析报告\n"]
        report_parts.append(f"综合评分: {score}/100\n")
        
        # 添加比率分析
        report_parts.append("\n财务比率分析:")
        for ratio_name, assessment in assessments.items():
            if assessment['value'] is not None:
                report_parts.append(
                    f"- {ratio_name.upper()}: {assessment['value']} ({assessment['assessment']}) - {assessment['comment']}"
                )
        
        # 总体评价
        if score >= 80:
            overall = "优秀，公司基本面非常健康"
        elif score >= 60:
            overall = "良好，公司基本面稳健"
        elif score >= 40:
            overall = "一般，需要关注某些财务指标"
        else:
            overall = "较差，存在明显的财务风险"
        
        report_parts.append(f"\n总体评价: {overall}")
        
        # 风险提示
        poor_ratios = [name for name, assess in assessments.items() 
                      if assess['assessment'] == 'poor' and assess['value'] is not None]
        if poor_ratios:
            report_parts.append(f"\n风险提示: 需要关注以下指标: {', '.join(poor_ratios)}")
        
        return '\n'.join(report_parts)


# 使用示例
async def test_fundamental_analysis():
    """测试基本面分析Agent"""
    config = {}
    agent = FundamentalAnalysisAgent(config)
    
    # 模拟财务数据
    financial_data = {
        'revenue': 150000000000,
        'net_income': 25000000000,
        'total_assets': 800000000000,
        'total_liabilities': 450000000000,
        'shareholders_equity': 350000000000,
        'operating_cash_flow': 40000000000,
        'pe_ratio': 15.2,
        'pb_ratio': 1.1,
        'roe': 0.0714
    }
    
    task = AgentTask(
        task_id="test_fundamental_001",
        task_type="fundamental_analysis",
        input_data={
            'stock_code': '00700',
            'financial_data': financial_data
        }
    )
    
    result = await agent.execute(task)
    print(f"Success: {result.success}")
    print(f"Fundamental Score: {result.data.get('fundamental_score')}")
    print(f"Analysis Report:\n{result.data.get('analysis_report')}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_fundamental_analysis())