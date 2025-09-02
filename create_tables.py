#!/usr/bin/env python3
"""
创建数据库表
"""

from app.services.database import db_service
from app.models import Base
from loguru import logger

def create_all_tables():
    """创建所有数据库表"""
    try:
        logger.info("开始创建数据库表...")
        
        # 创建所有表
        db_service.create_tables()
        
        logger.info("所有数据库表创建成功!")
        
        # 验证表是否创建成功
        from sqlalchemy import text
        with db_service.engine.connect() as conn:
            # SQLite查询所有表
            result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';"))
            tables = [row[0] for row in result]
            
            logger.info(f"创建的表: {tables}")
            
            expected_tables = [
                'users', 'stocks', 'stock_prices', 'financial_reports',
                'analysis_tasks', 'investment_recommendations', 'user_alerts',
                'alert_triggers', 'portfolios', 'positions', 'trades',
                'market_data', 'watchlists', 'watchlist_items'
            ]
            
            missing_tables = [table for table in expected_tables if table not in tables]
            if missing_tables:
                logger.warning(f"缺少的表: {missing_tables}")
            else:
                logger.info("✅ 所有预期表都已创建!")
                
        return True
        
    except Exception as e:
        logger.error(f"创建数据库表失败: {e}")
        return False

if __name__ == "__main__":
    success = create_all_tables()
    if success:
        print("🎉 数据库初始化成功!")
    else:
        print("❌ 数据库初始化失败!")
        exit(1)