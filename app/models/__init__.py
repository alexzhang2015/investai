"""
Database models for InvestAI
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
import uuid
from datetime import datetime

Base = declarative_base()


class User(Base):
    """用户模型"""
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100))
    phone = Column(String(20))
    risk_profile = Column(JSON, default={})
    subscription_plan = Column(String(20), default="free")
    subscription_expires_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f"<User {self.username}>"


class Stock(Base):
    """股票基本信息模型"""
    __tablename__ = "stocks"
    
    code = Column(String(10), primary_key=True)
    name = Column(String(100), nullable=False)
    market = Column(String(20), nullable=False)
    industry = Column(String(50))
    sector = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    
    def __repr__(self):
        return f"<Stock {self.code}: {self.name}>"


class StockPrice(Base):
    """股价数据模型"""
    __tablename__ = "stock_prices"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    stock_code = Column(String(10), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    open_price = Column(Float)
    high_price = Column(Float)
    low_price = Column(Float)
    close_price = Column(Float)
    volume = Column(Integer)
    adj_close_price = Column(Float)
    created_at = Column(DateTime, default=datetime.now)
    
    def __repr__(self):
        return f"<StockPrice {self.stock_code} at {self.timestamp}>"


class FinancialReport(Base):
    """财务报告模型"""
    __tablename__ = "financial_reports"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    stock_code = Column(String(10), nullable=False)
    report_period = Column(DateTime, nullable=False)
    report_type = Column(String(20), nullable=False)  # annual, quarterly
    revenue = Column(Float)
    net_income = Column(Float)
    total_assets = Column(Float)
    total_liabilities = Column(Float)
    shareholders_equity = Column(Float)
    operating_cash_flow = Column(Float)
    raw_data = Column(JSON)
    created_at = Column(DateTime, default=datetime.now)
    
    def __repr__(self):
        return f"<FinancialReport {self.stock_code} {self.report_period}>"


class AnalysisTask(Base):
    """分析任务模型"""
    __tablename__ = "analysis_tasks"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36))
    stock_code = Column(String(10), nullable=False)
    task_type = Column(String(50), nullable=False)
    status = Column(String(20), default="pending")  # pending, running, completed, failed
    input_params = Column(JSON, default={})
    result = Column(JSON, default={})
    error_message = Column(Text)
    execution_time_ms = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)
    completed_at = Column(DateTime)
    
    def __repr__(self):
        return f"<AnalysisTask {self.task_type} for {self.stock_code}>"


class InvestmentRecommendation(Base):
    """投资建议模型"""
    __tablename__ = "investment_recommendations"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    analysis_task_id = Column(String(36))
    user_id = Column(String(36))
    stock_code = Column(String(10), nullable=False)
    recommendation = Column(String(20), nullable=False)  # buy, sell, hold
    confidence_score = Column(Float)
    target_price = Column(Float)
    stop_loss = Column(Float)
    reasoning = Column(Text)
    fundamental_score = Column(Integer)
    technical_score = Column(Integer)
    sentiment_score = Column(Integer)
    risk_score = Column(Integer)
    created_at = Column(DateTime, default=datetime.now)
    
    def __repr__(self):
        return f"<InvestmentRecommendation {self.recommendation} for {self.stock_code}>"


class UserAlert(Base):
    """用户预警设置模型"""
    __tablename__ = "user_alerts"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    stock_code = Column(String(10), nullable=False)
    alert_type = Column(String(30), nullable=False)  # price, volume, news, technical
    condition_type = Column(String(20), nullable=False)  # above, below, change_percent
    threshold_value = Column(Float)
    is_active = Column(Boolean, default=True)
    notification_methods = Column(JSON, default=["email"])
    created_at = Column(DateTime, default=datetime.now)
    triggered_at = Column(DateTime)
    
    def __repr__(self):
        return f"<UserAlert {self.alert_type} for {self.stock_code}>"


class AlertTrigger(Base):
    """预警触发记录模型"""
    __tablename__ = "alert_triggers"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    alert_id = Column(String(36), nullable=False)
    trigger_value = Column(Float)
    trigger_time = Column(DateTime, default=datetime.now)
    notification_sent = Column(Boolean, default=False)
    notification_details = Column(JSON, default={})
    
    def __repr__(self):
        return f"<AlertTrigger for alert {self.alert_id}>"


class Portfolio(Base):
    """投资组合模型"""
    __tablename__ = "portfolios"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    initial_cash = Column(Float, nullable=False)
    cash_balance = Column(Float, nullable=False)
    total_value = Column(Float, default=0.0)
    total_return = Column(Float, default=0.0)
    total_return_percent = Column(Float, default=0.0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f"<Portfolio {self.name} by user {self.user_id}>"


class Position(Base):
    """持仓模型"""
    __tablename__ = "positions"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    portfolio_id = Column(String(36), nullable=False)
    stock_code = Column(String(10), nullable=False)
    stock_name = Column(String(100))
    shares = Column(Integer, nullable=False)
    average_cost = Column(Float, nullable=False)
    current_price = Column(Float, default=0.0)
    market_value = Column(Float, default=0.0)
    unrealized_pnl = Column(Float, default=0.0)
    unrealized_pnl_percent = Column(Float, default=0.0)
    last_updated = Column(DateTime, default=datetime.now)
    created_at = Column(DateTime, default=datetime.now)
    
    def __repr__(self):
        return f"<Position {self.stock_code}: {self.shares} shares>"


class Trade(Base):
    """交易记录模型"""
    __tablename__ = "trades"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    portfolio_id = Column(String(36), nullable=False)
    user_id = Column(String(36), nullable=False)
    stock_code = Column(String(10), nullable=False)
    stock_name = Column(String(100))
    trade_type = Column(String(10), nullable=False)  # buy, sell
    order_type = Column(String(10), nullable=False)  # market, limit
    shares = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    limit_price = Column(Float)  # 限价单价格
    total_amount = Column(Float, nullable=False)
    commission = Column(Float, default=0.0)
    status = Column(String(20), default="pending")  # pending, executed, cancelled, failed
    executed_at = Column(DateTime)
    cancelled_at = Column(DateTime)
    error_message = Column(Text)
    created_at = Column(DateTime, default=datetime.now)
    
    def __repr__(self):
        return f"<Trade {self.trade_type} {self.shares} {self.stock_code} at {self.price}>"


class MarketData(Base):
    """市场数据缓存模型"""
    __tablename__ = "market_data"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    symbol = Column(String(10), nullable=False, unique=True)
    stock_name = Column(String(100))
    current_price = Column(Float, nullable=False)
    change = Column(Float, default=0.0)
    change_percent = Column(Float, default=0.0)
    volume = Column(Integer, default=0)
    market_cap = Column(Float)
    pe_ratio = Column(Float)
    pb_ratio = Column(Float)
    dividend_yield = Column(Float)
    week_52_high = Column(Float)
    week_52_low = Column(Float)
    data_source = Column(String(50), default="futu")
    last_updated = Column(DateTime, default=datetime.now)
    created_at = Column(DateTime, default=datetime.now)
    
    def __repr__(self):
        return f"<MarketData {self.symbol}: {self.current_price}>"


class Watchlist(Base):
    """关注列表模型"""
    __tablename__ = "watchlists"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    def __repr__(self):
        return f"<Watchlist {self.name} by user {self.user_id}>"


class WatchlistItem(Base):
    """关注列表项目模型"""
    __tablename__ = "watchlist_items"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    watchlist_id = Column(String(36), nullable=False)
    stock_code = Column(String(10), nullable=False)
    stock_name = Column(String(100))
    added_at = Column(DateTime, default=datetime.now)
    
    def __repr__(self):
        return f"<WatchlistItem {self.stock_code} in watchlist {self.watchlist_id}>"


# 导出所有模型
__all__ = [
    'User',
    'Stock', 
    'StockPrice',
    'FinancialReport',
    'AnalysisTask',
    'InvestmentRecommendation',
    'UserAlert',
    'AlertTrigger',
    'Portfolio',
    'Position',
    'Trade',
    'MarketData',
    'Watchlist',
    'WatchlistItem'
]