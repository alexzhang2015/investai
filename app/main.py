"""
InvestAI FastAPI 主应用
"""
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import jwt
from jwt import PyJWTError
from passlib.context import CryptContext
from pydantic import BaseModel
import uuid

from app import create_agent_orchestrator
from app.services.database import get_db
from sqlalchemy.orm import Session
from app.models import User, AnalysisTask, InvestmentRecommendation, Portfolio, Position, Trade, MarketData, Watchlist, WatchlistItem

# JWT配置
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# 密码哈希
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

app = FastAPI(
    title="InvestAI API",
    description="AI驱动的智能股票投资分析平台",
    version="1.0.0"
)

# CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3001", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Agent编排器实例
agent_orchestrator = create_agent_orchestrator({})

# Pydantic模型
class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class StockAnalysisRequest(BaseModel):
    stock_code: str
    analysis_types: List[str] = ["fundamental", "technical", "sentiment"]

class AnalysisResult(BaseModel):
    task_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

# 交易相关的Pydantic模型
class PortfolioCreate(BaseModel):
    name: str
    initial_cash: float
    description: Optional[str] = None

class PortfolioResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    initial_cash: float
    cash_balance: float
    total_value: float
    total_return: float
    total_return_percent: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

class PositionResponse(BaseModel):
    id: str
    portfolio_id: str
    stock_code: str
    stock_name: Optional[str]
    shares: int
    average_cost: float
    current_price: float
    market_value: float
    unrealized_pnl: float
    unrealized_pnl_percent: float
    last_updated: datetime
    created_at: datetime

class TradeRequest(BaseModel):
    portfolio_id: str
    stock_code: str
    trade_type: str  # buy, sell
    order_type: str  # market, limit
    shares: int
    limit_price: Optional[float] = None

class TradeResponse(BaseModel):
    id: str
    portfolio_id: str
    user_id: str
    stock_code: str
    stock_name: Optional[str]
    trade_type: str
    order_type: str
    shares: int
    price: float
    limit_price: Optional[float]
    total_amount: float
    commission: float
    status: str
    executed_at: Optional[datetime]
    created_at: datetime

class MarketDataResponse(BaseModel):
    symbol: str
    stock_name: Optional[str]
    current_price: float
    change: float
    change_percent: float
    volume: int
    market_cap: Optional[float]
    pe_ratio: Optional[float]
    updated_at: datetime

class WatchlistCreate(BaseModel):
    name: str
    description: Optional[str] = None

class WatchlistResponse(BaseModel):
    id: str
    user_id: str
    name: str
    description: Optional[str]
    symbols: List[str]
    created_at: datetime
    updated_at: datetime

# 工具函数
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except PyJWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# 路由
@app.get("/")
async def root():
    return {"message": "InvestAI API 服务运行中", "version": "1.0.0"}

@app.post("/auth/register", response_model=Token)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    # 检查用户是否已存在
    existing_user = db.query(User).filter(
        (User.username == user.username) | (User.email == user.email)
    ).first()
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="用户名或邮箱已存在"
        )
    
    # 创建新用户
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        password_hash=hashed_password,
        full_name=user.full_name,
        risk_profile={"level": "moderate", "experience": "intermediate"}
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # 生成访问令牌
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/login", response_model=Token)
async def login(form_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="用户名或密码错误",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/auth/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "risk_profile": current_user.risk_profile,
        "subscription_plan": current_user.subscription_plan
    }

@app.post("/analysis/stock", response_model=AnalysisResult)
async def analyze_stock(
    request: StockAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """分析单只股票"""
    try:
        # 创建分析任务
        task_id = str(uuid.uuid4())
        analysis_task = AnalysisTask(
            id=task_id,
            user_id=current_user.id,
            stock_code=request.stock_code,
            task_type="full_analysis",
            status="pending",
            input_params={"analysis_types": request.analysis_types}
        )
        
        db.add(analysis_task)
        db.commit()
        
        # 异步执行分析任务
        # 这里可以集成消息队列进行异步处理
        analysis_data = {
            'stock_code': request.stock_code,
            'analysis_types': request.analysis_types,
            'user_id': str(current_user.id)
        }
        
        # 模拟分析过程
        result = await agent_orchestrator.execute_full_analysis(analysis_data)
        
        # 更新任务状态
        analysis_task.status = "completed"
        analysis_task.result = result
        analysis_task.completed_at = datetime.utcnow()
        analysis_task.execution_time_ms = 1000  # 模拟执行时间
        
        db.commit()
        
        return AnalysisResult(
            task_id=task_id,
            status="completed",
            result=result,
            created_at=analysis_task.created_at,
            completed_at=analysis_task.completed_at
        )
        
    except Exception as e:
        # 更新任务状态为失败
        if 'analysis_task' in locals():
            analysis_task.status = "failed"
            analysis_task.error_message = str(e)
            db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"分析失败: {str(e)}"
        )

@app.get("/analysis/stock/{task_id}", response_model=AnalysisResult)
async def get_analysis_result(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取分析结果"""
    analysis_task = db.query(AnalysisTask).filter(
        AnalysisTask.id == task_id,
        AnalysisTask.user_id == current_user.id
    ).first()
    
    if not analysis_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="分析任务不存在"
        )
    
    return AnalysisResult(
        task_id=analysis_task.id,
        status=analysis_task.status,
        result=analysis_task.result,
        error_message=analysis_task.error_message,
        created_at=analysis_task.created_at,
        completed_at=analysis_task.completed_at
    )

@app.get("/analysis/history")
async def get_analysis_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 10
):
    """获取分析历史"""
    tasks = db.query(AnalysisTask).filter(
        AnalysisTask.user_id == current_user.id
    ).order_by(AnalysisTask.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        {
            "task_id": task.id,
            "stock_code": task.stock_code,
            "status": task.status,
            "created_at": task.created_at,
            "completed_at": task.completed_at
        }
        for task in tasks
    ]

@app.get("/stocks/{stock_code}/recommendations")
async def get_stock_recommendations(
    stock_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取股票推荐历史"""
    recommendations = db.query(InvestmentRecommendation).filter(
        InvestmentRecommendation.stock_code == stock_code,
        InvestmentRecommendation.user_id == current_user.id
    ).order_by(InvestmentRecommendation.created_at.desc()).limit(5).all()
    
    return [
        {
            "recommendation": rec.recommendation,
            "confidence": rec.confidence,
            "target_price": rec.target_price,
            "stop_loss": rec.stop_loss,
            "created_at": rec.created_at
        }
        for rec in recommendations
    ]

# ===== 投资组合管理API =====
@app.post("/trading/portfolios", response_model=PortfolioResponse)
async def create_portfolio(
    portfolio: PortfolioCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """创建投资组合"""
    db_portfolio = Portfolio(
        user_id=current_user.id,
        name=portfolio.name,
        description=portfolio.description,
        initial_cash=portfolio.initial_cash,
        cash_balance=portfolio.initial_cash,
        total_value=portfolio.initial_cash
    )
    
    db.add(db_portfolio)
    db.commit()
    db.refresh(db_portfolio)
    
    return PortfolioResponse(
        id=db_portfolio.id,
        user_id=db_portfolio.user_id,
        name=db_portfolio.name,
        description=db_portfolio.description,
        initial_cash=db_portfolio.initial_cash,
        cash_balance=db_portfolio.cash_balance,
        total_value=db_portfolio.total_value,
        total_return=db_portfolio.total_return,
        total_return_percent=db_portfolio.total_return_percent,
        is_active=db_portfolio.is_active,
        created_at=db_portfolio.created_at,
        updated_at=db_portfolio.updated_at
    )

@app.get("/trading/portfolios", response_model=List[PortfolioResponse])
async def get_portfolios(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取用户的投资组合列表"""
    portfolios = db.query(Portfolio).filter(
        Portfolio.user_id == current_user.id,
        Portfolio.is_active == True
    ).order_by(Portfolio.created_at.desc()).all()
    
    return [
        PortfolioResponse(
            id=p.id,
            user_id=p.user_id,
            name=p.name,
            description=p.description,
            initial_cash=p.initial_cash,
            cash_balance=p.cash_balance,
            total_value=p.total_value,
            total_return=p.total_return,
            total_return_percent=p.total_return_percent,
            is_active=p.is_active,
            created_at=p.created_at,
            updated_at=p.updated_at
        )
        for p in portfolios
    ]

@app.get("/trading/portfolios/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取特定投资组合"""
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id,
        Portfolio.is_active == True
    ).first()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="投资组合不存在"
        )
    
    return PortfolioResponse(
        id=portfolio.id,
        user_id=portfolio.user_id,
        name=portfolio.name,
        description=portfolio.description,
        initial_cash=portfolio.initial_cash,
        cash_balance=portfolio.cash_balance,
        total_value=portfolio.total_value,
        total_return=portfolio.total_return,
        total_return_percent=portfolio.total_return_percent,
        is_active=portfolio.is_active,
        created_at=portfolio.created_at,
        updated_at=portfolio.updated_at
    )

@app.get("/trading/portfolios/{portfolio_id}/positions", response_model=List[PositionResponse])
async def get_positions(
    portfolio_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """获取投资组合的持仓"""
    # 验证投资组合所有权
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == portfolio_id,
        Portfolio.user_id == current_user.id,
        Portfolio.is_active == True
    ).first()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="投资组合不存在"
        )
    
    positions = db.query(Position).filter(
        Position.portfolio_id == portfolio_id
    ).all()
    
    return [
        PositionResponse(
            id=pos.id,
            portfolio_id=pos.portfolio_id,
            stock_code=pos.stock_code,
            stock_name=pos.stock_name,
            shares=pos.shares,
            average_cost=pos.average_cost,
            current_price=pos.current_price,
            market_value=pos.market_value,
            unrealized_pnl=pos.unrealized_pnl,
            unrealized_pnl_percent=pos.unrealized_pnl_percent,
            last_updated=pos.last_updated,
            created_at=pos.created_at
        )
        for pos in positions
    ]

# ===== 交易API =====
@app.post("/trading/trades", response_model=TradeResponse)
async def submit_trade(
    trade_request: TradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """提交交易订单"""
    # 验证投资组合所有权
    portfolio = db.query(Portfolio).filter(
        Portfolio.id == trade_request.portfolio_id,
        Portfolio.user_id == current_user.id,
        Portfolio.is_active == True
    ).first()
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="投资组合不存在"
        )
    
    # 获取市场价格（模拟）
    market_price = await get_mock_market_price(trade_request.stock_code)
    execution_price = trade_request.limit_price if trade_request.order_type == "limit" else market_price
    
    # 计算总金额和手续费
    total_amount = execution_price * trade_request.shares
    commission = total_amount * 0.001  # 0.1%手续费
    
    # 验证资金或持仓
    if trade_request.trade_type == "buy":
        required_amount = total_amount + commission
        if portfolio.cash_balance < required_amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="资金不足"
            )
    elif trade_request.trade_type == "sell":
        position = db.query(Position).filter(
            Position.portfolio_id == trade_request.portfolio_id,
            Position.stock_code == trade_request.stock_code
        ).first()
        if not position or position.shares < trade_request.shares:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="持仓不足"
            )
    
    # 创建交易记录
    db_trade = Trade(
        portfolio_id=trade_request.portfolio_id,
        user_id=current_user.id,
        stock_code=trade_request.stock_code,
        stock_name=f"股票{trade_request.stock_code}",
        trade_type=trade_request.trade_type,
        order_type=trade_request.order_type,
        shares=trade_request.shares,
        price=execution_price,
        limit_price=trade_request.limit_price,
        total_amount=total_amount,
        commission=commission,
        status="executed",  # 模拟即时执行
        executed_at=datetime.utcnow()
    )
    
    db.add(db_trade)
    
    # 更新投资组合和持仓
    await update_portfolio_after_trade(db, portfolio, db_trade)
    
    db.commit()
    db.refresh(db_trade)
    
    return TradeResponse(
        id=db_trade.id,
        portfolio_id=db_trade.portfolio_id,
        user_id=db_trade.user_id,
        stock_code=db_trade.stock_code,
        stock_name=db_trade.stock_name,
        trade_type=db_trade.trade_type,
        order_type=db_trade.order_type,
        shares=db_trade.shares,
        price=db_trade.price,
        limit_price=db_trade.limit_price,
        total_amount=db_trade.total_amount,
        commission=db_trade.commission,
        status=db_trade.status,
        executed_at=db_trade.executed_at,
        created_at=db_trade.created_at
    )

@app.get("/trading/trades", response_model=List[TradeResponse])
async def get_trades(
    portfolio_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50
):
    """获取交易历史"""
    query = db.query(Trade).filter(Trade.user_id == current_user.id)
    
    if portfolio_id:
        # 验证投资组合所有权
        portfolio = db.query(Portfolio).filter(
            Portfolio.id == portfolio_id,
            Portfolio.user_id == current_user.id
        ).first()
        if not portfolio:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="投资组合不存在"
            )
        query = query.filter(Trade.portfolio_id == portfolio_id)
    
    trades = query.order_by(Trade.created_at.desc()).offset(skip).limit(limit).all()
    
    return [
        TradeResponse(
            id=trade.id,
            portfolio_id=trade.portfolio_id,
            user_id=trade.user_id,
            stock_code=trade.stock_code,
            stock_name=trade.stock_name,
            trade_type=trade.trade_type,
            order_type=trade.order_type,
            shares=trade.shares,
            price=trade.price,
            limit_price=trade.limit_price,
            total_amount=trade.total_amount,
            commission=trade.commission,
            status=trade.status,
            executed_at=trade.executed_at,
            created_at=trade.created_at
        )
        for trade in trades
    ]

# ===== 市场数据API =====
@app.get("/market/data/{symbol}", response_model=MarketDataResponse)
async def get_market_data(symbol: str):
    """获取股票市场数据"""
    # 模拟市场数据
    mock_data = await get_mock_market_data(symbol)
    
    return MarketDataResponse(
        symbol=symbol,
        stock_name=f"股票{symbol}",
        current_price=mock_data["price"],
        change=mock_data["change"],
        change_percent=mock_data["change_percent"],
        volume=mock_data["volume"],
        market_cap=mock_data.get("market_cap"),
        pe_ratio=mock_data.get("pe_ratio"),
        updated_at=datetime.utcnow()
    )

@app.post("/market/data/batch", response_model=List[MarketDataResponse])
async def get_multiple_market_data(request: Dict[str, List[str]]):
    """批量获取市场数据"""
    symbols = request.get("symbols", [])
    results = []
    
    for symbol in symbols:
        mock_data = await get_mock_market_data(symbol)
        results.append(MarketDataResponse(
            symbol=symbol,
            stock_name=f"股票{symbol}",
            current_price=mock_data["price"],
            change=mock_data["change"],
            change_percent=mock_data["change_percent"],
            volume=mock_data["volume"],
            market_cap=mock_data.get("market_cap"),
            pe_ratio=mock_data.get("pe_ratio"),
            updated_at=datetime.utcnow()
        ))
    
    return results

@app.get("/market/search")
async def search_stocks(q: str):
    """搜索股票"""
    # 模拟股票搜索
    mock_results = [
        {"symbol": f"{q}", "name": f"股票{q}"},
        {"symbol": f"0{q}", "name": f"股票0{q}"},
        {"symbol": f"{q}0", "name": f"股票{q}0"},
    ]
    return mock_results[:5]  # 返回前5个结果

# ===== 工具函数 =====
async def get_mock_market_price(stock_code: str) -> float:
    """获取模拟市场价格"""
    import random
    # 根据股票代码生成一个相对稳定的价格
    base_price = hash(stock_code) % 1000 + 50
    variation = random.uniform(-0.05, 0.05)
    return round(base_price * (1 + variation), 2)

async def get_mock_market_data(symbol: str) -> Dict[str, Any]:
    """获取模拟市场数据"""
    import random
    
    base_price = hash(symbol) % 1000 + 50
    current_price = round(base_price * random.uniform(0.95, 1.05), 2)
    yesterday_price = round(base_price * random.uniform(0.95, 1.05), 2)
    change = round(current_price - yesterday_price, 2)
    change_percent = round((change / yesterday_price) * 100, 2) if yesterday_price > 0 else 0
    
    return {
        "price": current_price,
        "change": change,
        "change_percent": change_percent,
        "volume": random.randint(10000, 1000000),
        "market_cap": random.randint(1000000, 100000000),
        "pe_ratio": round(random.uniform(5, 50), 2)
    }

async def update_portfolio_after_trade(db: Session, portfolio: Portfolio, trade: Trade):
    """交易后更新投资组合和持仓"""
    if trade.trade_type == "buy":
        # 扣除现金
        portfolio.cash_balance -= (trade.total_amount + trade.commission)
        
        # 更新或创建持仓
        position = db.query(Position).filter(
            Position.portfolio_id == trade.portfolio_id,
            Position.stock_code == trade.stock_code
        ).first()
        
        if position:
            # 更新现有持仓
            new_shares = position.shares + trade.shares
            new_cost = ((position.average_cost * position.shares) + trade.total_amount) / new_shares
            position.shares = new_shares
            position.average_cost = round(new_cost, 2)
            position.current_price = trade.price
            position.market_value = new_shares * trade.price
            position.unrealized_pnl = position.market_value - (new_shares * new_cost)
            position.unrealized_pnl_percent = (position.unrealized_pnl / (new_shares * new_cost)) * 100 if new_cost > 0 else 0
            position.last_updated = datetime.utcnow()
        else:
            # 创建新持仓
            new_position = Position(
                portfolio_id=trade.portfolio_id,
                stock_code=trade.stock_code,
                stock_name=trade.stock_name,
                shares=trade.shares,
                average_cost=trade.price,
                current_price=trade.price,
                market_value=trade.total_amount,
                unrealized_pnl=0,
                unrealized_pnl_percent=0
            )
            db.add(new_position)
    
    elif trade.trade_type == "sell":
        # 增加现金
        portfolio.cash_balance += (trade.total_amount - trade.commission)
        
        # 更新持仓
        position = db.query(Position).filter(
            Position.portfolio_id == trade.portfolio_id,
            Position.stock_code == trade.stock_code
        ).first()
        
        if position:
            position.shares -= trade.shares
            if position.shares == 0:
                # 清空持仓
                db.delete(position)
            else:
                # 更新持仓数据
                position.current_price = trade.price
                position.market_value = position.shares * trade.price
                position.unrealized_pnl = position.market_value - (position.shares * position.average_cost)
                position.unrealized_pnl_percent = (position.unrealized_pnl / (position.shares * position.average_cost)) * 100 if position.average_cost > 0 else 0
                position.last_updated = datetime.utcnow()
    
    # 重新计算投资组合总值
    positions = db.query(Position).filter(Position.portfolio_id == portfolio.id).all()
    total_market_value = sum(pos.market_value for pos in positions)
    portfolio.total_value = portfolio.cash_balance + total_market_value
    portfolio.total_return = portfolio.total_value - portfolio.initial_cash
    portfolio.total_return_percent = (portfolio.total_return / portfolio.initial_cash) * 100 if portfolio.initial_cash > 0 else 0
    portfolio.updated_at = datetime.utcnow()

@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)