"""
技术分析Agent - 负责分析股票价格走势和技术指标
"""
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import numpy as np
import pandas as pd
from loguru import logger

from app.agents.base import BaseAgent, AgentTask, AgentResult


class TechnicalAnalysisAgent(BaseAgent):
    """技术分析Agent"""
    
    def __init__(self, config: Dict[str, Any]):
        super().__init__("technical_analyst", config)
        # 技术指标配置
        self.indicator_config = {
            'rsi': {'period': 14, 'overbought': 70, 'oversold': 30},
            'macd': {'fast': 12, 'slow': 26, 'signal': 9},
            'bollinger': {'period': 20, 'std_dev': 2},
            'stochastic': {'k_period': 14, 'd_period': 3},
            'moving_averages': [5, 20, 60]
        }
    
    async def execute(self, task: AgentTask) -> AgentResult:
        """执行技术分析任务"""
        start_time = datetime.now()
        
        try:
            price_data = task.input_data.get('price_data', {})
            stock_code = task.input_data.get('stock_code', 'Unknown')
            
            if not price_data or 'price_history' not in price_data:
                return AgentResult(
                    task_id=task.task_id,
                    success=False,
                    data={},
                    error_msg="No price data provided"
                )
            
            # 转换价格数据为DataFrame
            df = self._prepare_dataframe(price_data['price_history'])
            
            if len(df) < 20:  # 需要足够的数据点
                return AgentResult(
                    task_id=task.task_id,
                    success=False,
                    data={},
                    error_msg="Insufficient price data for technical analysis"
                )
            
            # 计算技术指标
            indicators = self._calculate_technical_indicators(df)
            
            # 识别技术模式
            patterns = self._identify_patterns(df)
            
            # 确定趋势方向
            trend = self._determine_trend(df, indicators)
            
            # 计算技术分析评分
            technical_score = self._calculate_technical_score(indicators, patterns, trend)
            
            # 生成分析报告
            analysis_report = self._generate_analysis_report(
                stock_code, indicators, patterns, trend, technical_score
            )
            
            # 寻找支撑阻力位
            support_resistance = self._find_support_resistance(df)
            
            result_data = {
                'technical_score': technical_score,
                'indicators': indicators,
                'patterns': patterns,
                'trend': trend,
                'support_resistance': support_resistance,
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
            logger.error(f"Technical analysis failed: {e}")
            return AgentResult(
                task_id=task.task_id,
                success=False,
                data={},
                error_msg=str(e),
                execution_time=(datetime.now() - start_time).total_seconds()
            )
    
    def _prepare_dataframe(self, price_history: List[Dict]) -> pd.DataFrame:
        """准备价格数据DataFrame"""
        df = pd.DataFrame(price_history)
        
        # 确保日期格式正确
        if 'date' in df.columns:
            df['date'] = pd.to_datetime(df['date'])
            df.set_index('date', inplace=True)
        
        # 确保有close价格
        if 'close' not in df.columns and 'price' in df.columns:
            df.rename(columns={'price': 'close'}, inplace=True)
        
        # 排序数据
        df.sort_index(inplace=True)
        
        return df
    
    def _calculate_technical_indicators(self, df: pd.DataFrame) -> Dict[str, Any]:
        """计算技术指标"""
        indicators = {}
        
        # 移动平均线
        for period in self.indicator_config['moving_averages']:
            if len(df) >= period:
                ma_name = f'ma_{period}'
                indicators[ma_name] = df['close'].rolling(window=period).mean().iloc[-1]
        
        # RSI
        if len(df) >= self.indicator_config['rsi']['period']:
            indicators['rsi'] = self._calculate_rsi(df)
        
        # MACD
        if len(df) >= self.indicator_config['macd']['slow']:
            macd_data = self._calculate_macd(df)
            indicators.update(macd_data)
        
        # 布林带
        if len(df) >= self.indicator_config['bollinger']['period']:
            bollinger_data = self._calculate_bollinger_bands(df)
            indicators.update(bollinger_data)
        
        # 随机指标
        if len(df) >= self.indicator_config['stochastic']['k_period']:
            stochastic_data = self._calculate_stochastic(df)
            indicators.update(stochastic_data)
        
        # 成交量指标
        if 'volume' in df.columns:
            volume_data = self._calculate_volume_indicators(df)
            indicators.update(volume_data)
        
        return indicators
    
    def _calculate_rsi(self, df: pd.DataFrame) -> float:
        """计算RSI指标"""
        period = self.indicator_config['rsi']['period']
        delta = df['close'].diff()
        
        gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
        
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        
        return round(rsi.iloc[-1], 2)
    
    def _calculate_macd(self, df: pd.DataFrame) -> Dict[str, float]:
        """计算MACD指标"""
        config = self.indicator_config['macd']
        
        ema_fast = df['close'].ewm(span=config['fast']).mean()
        ema_slow = df['close'].ewm(span=config['slow']).mean()
        
        macd = ema_fast - ema_slow
        macd_signal = macd.ewm(span=config['signal']).mean()
        macd_histogram = macd - macd_signal
        
        return {
            'macd': round(macd.iloc[-1], 2),
            'macd_signal': round(macd_signal.iloc[-1], 2),
            'macd_histogram': round(macd_histogram.iloc[-1], 2)
        }
    
    def _calculate_bollinger_bands(self, df: pd.DataFrame) -> Dict[str, float]:
        """计算布林带"""
        config = self.indicator_config['bollinger']
        
        sma = df['close'].rolling(window=config['period']).mean()
        std = df['close'].rolling(window=config['period']).std()
        
        upper_band = sma + (std * config['std_dev'])
        lower_band = sma - (std * config['std_dev'])
        
        return {
            'bollinger_upper': round(upper_band.iloc[-1], 2),
            'bollinger_middle': round(sma.iloc[-1], 2),
            'bollinger_lower': round(lower_band.iloc[-1], 2),
            'bollinger_width': round((upper_band.iloc[-1] - lower_band.iloc[-1]) / sma.iloc[-1], 4)
        }
    
    def _calculate_stochastic(self, df: pd.DataFrame) -> Dict[str, float]:
        """计算随机指标"""
        config = self.indicator_config['stochastic']
        
        low_min = df['low'].rolling(window=config['k_period']).min()
        high_max = df['high'].rolling(window=config['k_period']).max()
        
        k = 100 * ((df['close'] - low_min) / (high_max - low_min))
        d = k.rolling(window=config['d_period']).mean()
        
        return {
            'stochastic_k': round(k.iloc[-1], 2),
            'stochastic_d': round(d.iloc[-1], 2)
        }
    
    def _calculate_volume_indicators(self, df: pd.DataFrame) -> Dict[str, float]:
        """计算成交量指标"""
        volume_ma_20 = df['volume'].rolling(window=20).mean()
        
        return {
            'volume_ma_20': round(volume_ma_20.iloc[-1], 0),
            'volume_ratio': round(df['volume'].iloc[-1] / volume_ma_20.iloc[-1], 2)
        }
    
    def _identify_patterns(self, df: pd.DataFrame) -> Dict[str, Any]:
        """识别技术模式"""
        patterns = {'patterns': [], 'signals': []}
        
        # 简化的模式识别
        recent_data = df.tail(10)
        
        # 检查是否接近支撑阻力位
        current_price = df['close'].iloc[-1]
        recent_high = recent_data['high'].max()
        recent_low = recent_data['low'].min()
        
        if current_price >= recent_high * 0.98:
            patterns['patterns'].append('approaching_resistance')
            patterns['signals'].append('caution')
        elif current_price <= recent_low * 1.02:
            patterns['patterns'].append('approaching_support')
            patterns['signals'].append('potential_bounce')
        
        # 检查移动平均线排列
        if 'ma_5' in df.columns and 'ma_20' in df.columns:
            if df['ma_5'].iloc[-1] > df['ma_20'].iloc[-1] > df['ma_60'].iloc[-1]:
                patterns['patterns'].append('bullish_ma_formation')
                patterns['signals'].append('bullish')
            elif df['ma_5'].iloc[-1] < df['ma_20'].iloc[-1] < df['ma_60'].iloc[-1]:
                patterns['patterns'].append('bearish_ma_formation')
                patterns['signals'].append('bearish')
        
        return patterns
    
    def _determine_trend(self, df: pd.DataFrame, indicators: Dict[str, Any]) -> Dict[str, Any]:
        """确定趋势方向"""
        trend = {'direction': 'neutral', 'strength': 'weak'}
        
        # 基于移动平均线判断趋势
        if 'ma_5' in indicators and 'ma_20' in indicators:
            if indicators['ma_5'] > indicators['ma_20']:
                trend['direction'] = 'bullish'
            else:
                trend['direction'] = 'bearish'
        
        # 基于价格位置判断趋势强度
        current_price = df['close'].iloc[-1]
        if 'bollinger_middle' in indicators:
            deviation = abs(current_price - indicators['bollinger_middle']) / indicators['bollinger_middle']
            if deviation > 0.05:
                trend['strength'] = 'strong'
            elif deviation > 0.02:
                trend['strength'] = 'moderate'
        
        return trend
    
    def _calculate_technical_score(self, indicators: Dict[str, Any], 
                                 patterns: Dict[str, Any], trend: Dict[str, Any]) -> int:
        """计算技术分析评分"""
        score = 50  # 基础分数
        
        # RSI评分
        rsi = indicators.get('rsi')
        if rsi:
            if 30 <= rsi <= 70:
                score += 10
            elif rsi < 30:
                score += 20  # 超卖，可能反弹
            elif rsi > 70:
                score -= 20  # 超买，可能调整
        
        # MACD评分
        macd = indicators.get('macd')
        macd_signal = indicators.get('macd_signal')
        if macd and macd_signal:
            if macd > macd_signal:
                score += 15
            else:
                score -= 15
        
        # 趋势评分
        if trend['direction'] == 'bullish':
            score += 10
            if trend['strength'] == 'strong':
                score += 5
        elif trend['direction'] == 'bearish':
            score -= 10
            if trend['strength'] == 'strong':
                score -= 5
        
        # 模式评分
        signals = patterns.get('signals', [])
        if 'bullish' in signals:
            score += 10
        if 'bearish' in signals:
            score -= 10
        
        return max(0, min(100, score))
    
    def _find_support_resistance(self, df: pd.DataFrame) -> Dict[str, float]:
        """寻找支撑阻力位"""
        recent_data = df.tail(50)
        
        support = recent_data['low'].min()
        resistance = recent_data['high'].max()
        
        # 寻找次要支撑阻力位
        price_levels = pd.concat([recent_data['high'], recent_data['low']])
        price_levels = price_levels.value_counts().head(5).index.tolist()
        
        return {
            'primary_support': round(support, 2),
            'primary_resistance': round(resistance, 2),
            'secondary_levels': [round(level, 2) for level in price_levels]
        }
    
    def _generate_analysis_report(self, stock_code: str, indicators: Dict[str, Any], 
                                patterns: Dict[str, Any], trend: Dict[str, Any], score: int) -> str:
        """生成技术分析报告"""
        report_parts = [f"股票 {stock_code} 技术分析报告\n"]
        report_parts.append(f"综合评分: {score}/100\n")
        
        # 趋势分析
        report_parts.append(f"趋势方向: {trend['direction']} ({trend['strength']})")
        
        # 关键指标
        report_parts.append("\n关键指标:")
        for key in ['rsi', 'macd', 'macd_signal', 'bollinger_upper', 'bollinger_lower']:
            if key in indicators:
                report_parts.append(f"- {key.upper()}: {indicators[key]}")
        
        # 移动平均线
        ma_keys = [k for k in indicators.keys() if k.startswith('ma_')]
        if ma_keys:
            report_parts.append("\n移动平均线:")
            for key in sorted(ma_keys):
                report_parts.append(f"- {key.upper()}: {indicators[key]:.2f}")
        
        # 模式识别
        if patterns['patterns']:
            report_parts.append(f"\n技术模式: {', '.join(patterns['patterns'])}")
        
        # 交易信号
        if patterns['signals']:
            report_parts.append(f"交易信号: {', '.join(patterns['signals'])}")
        
        # 总体建议
        if score >= 70:
            suggestion = "技术面强劲，建议关注买入机会"
        elif score >= 50:
            suggestion = "技术面中性，建议观望"
        else:
            suggestion = "技术面疲弱，建议谨慎操作"
        
        report_parts.append(f"\n总体建议: {suggestion}")
        
        return '\n'.join(report_parts)


# 使用示例
async def test_technical_analysis():
    """测试技术分析Agent"""
    config = {}
    agent = TechnicalAnalysisAgent(config)
    
    # 模拟价格数据
    price_data = {
        'price_history': [
            {'date': '2024-01-01', 'open': 310, 'high': 315, 'low': 308, 'close': 312, 'volume': 1000000},
            {'date': '2024-01-02', 'open': 312, 'high': 318, 'low': 310, 'close': 316, 'volume': 1200000},
            {'date': '2024-01-03', 'open': 316, 'high': 322, 'low': 315, 'close': 320, 'volume': 1500000},
            {'date': '2024-01-04', 'open': 320, 'high': 325, 'low': 318, 'close': 322, 'volume': 1300000},
            {'date': '2024-01-05', 'open': 322, 'high': 328, 'low': 320, 'close': 325, 'volume': 1400000},
            {'date': '2024-01-08', 'open': 325, 'high': 330, 'low': 323, 'close': 328, 'volume': 1600000},
            {'date': '2024-01-09', 'open': 328, 'high': 332, 'low': 326, 'close': 330, 'volume': 1700000},
            {'date': '2024-01-10', 'open': 330, 'high': 335, 'low': 328, 'close': 333, 'volume': 1800000},
            {'date': '2024-01-11', 'open': 333, 'high': 338, 'low': 331, 'close': 336, 'volume': 1900000},
            {'date': '2024-01-12', 'open': 336, 'high': 340, 'low': 334, 'close': 338, 'volume': 2000000},
            {'date': '2024-01-15', 'open': 338, 'high': 342, 'low': 336, 'close': 340, 'volume': 2100000}
        ]
    }
    
    task = AgentTask(
        task_id="test_technical_001",
        task_type="technical_analysis",
        input_data={
            'stock_code': '00700',
            'price_data': price_data
        }
    )
    
    result = await agent.execute(task)
    print(f"Success: {result.success}")
    print(f"Technical Score: {result.data.get('technical_score')}")
    print(f"Trend: {result.data.get('trend')}")
    print(f"Analysis Report:\n{result.data.get('analysis_report')}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(test_technical_analysis())