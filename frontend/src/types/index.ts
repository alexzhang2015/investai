export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string;
  risk_profile: 'conservative' | 'moderate' | 'aggressive';
  subscription_plan: 'basic' | 'premium' | 'enterprise';
  created_at: string;
  last_login?: string;
}

export interface StockAnalysisRequest {
  stock_code: string;
  analysis_types: ('fundamental' | 'technical' | 'sentiment')[];
}

export interface AnalysisResult {
  task_id: string;
  status: 'pending' | 'completed' | 'failed';
  result?: AnalysisData;
  created_at: string;
  completed_at?: string;
}

export interface AnalysisData {
  collected_data: any;
  analysis_results: {
    fundamental?: FundamentalAnalysis;
    technical?: TechnicalAnalysis;
    sentiment?: SentimentAnalysis;
  };
  strategy_result: StrategyResult;
  timestamp: string;
  stock_code: string;
}

export interface FundamentalAnalysis {
  financial_score: number;
  valuation_score: number;
  growth_score: number;
  profitability_score: number;
  overall_score: number;
  analysis_report: string;
  key_metrics: {
    pe_ratio: number;
    pb_ratio: number;
    roe: number;
    revenue_growth: number;
    profit_margin: number;
  };
}

export interface TechnicalAnalysis {
  technical_score: number;
  trend_direction: 'bullish' | 'bearish' | 'neutral';
  trend_strength: number;
  indicators: {
    rsi: number;
    macd: number;
    moving_averages: {
      ma5: number;
      ma20: number;
      ma60: number;
    };
  };
  support_resistance: {
    support: number[];
    resistance: number[];
  };
  analysis_report: string;
}

export interface SentimentAnalysis {
  sentiment_score: number;
  overall_sentiment: 'positive' | 'negative' | 'neutral';
  news_count: number;
  positive_news: number;
  negative_news: number;
  key_topics: string[];
  analysis_report: string;
}

export interface StrategyResult {
  recommendation: 'buy' | 'hold' | 'sell';
  confidence: number;
  target_price: number;
  stop_loss: number;
  position_size: number;
  reasoning: string;
}

export interface AnalysisHistory {
  id: string;
  stock_code: string;
  task_type: string;
  status: string;
  created_at: string;
  completed_at?: string;
  result?: AnalysisData;
}

export interface InvestmentRecommendation {
  id: string;
  symbol: string;
  stock_name: string;
  recommendation: string;
  confidence_score: number;
  analysis_summary: string;
  key_findings?: string[];
  risk_assessment?: string;
  created_at: string;
}

// 交易相关接口
export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  total_value: number;
  cash_balance: number;
  total_return: number;
  total_return_percent: number;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  portfolio_id: string;
  symbol: string;
  stock_name: string;
  shares: number;
  average_cost: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  portfolio_id: string;
  symbol: string;
  stock_name: string;
  trade_type: 'buy' | 'sell';
  shares: number;
  price: number;
  total_amount: number;
  commission: number;
  status: 'pending' | 'executed' | 'cancelled';
  executed_at?: string;
  created_at: string;
}

export interface TradeRequest {
  portfolio_id: string;
  symbol: string;
  trade_type: 'buy' | 'sell';
  shares: number;
  order_type: 'market' | 'limit';
  limit_price?: number;
}

export interface MarketData {
  symbol: string;
  current_price: number;
  change: number;
  change_percent: number;
  volume: number;
  market_cap?: number;
  pe_ratio?: number;
  updated_at: string;
}

export interface Watchlist {
  id: string;
  user_id: string;
  name: string;
  symbols: string[];
  created_at: string;
  updated_at: string;
}