"""
Database service for InvestAI
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from sqlalchemy.ext.declarative import declarative_base
from contextlib import contextmanager
import os
from loguru import logger

from app.models import Base


class DatabaseService:
    """数据库服务类"""
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or os.getenv(
            'DATABASE_URL', 
            'sqlite:///./investai.db'
        )
        self.engine = None
        self.session_factory = None
        self._setup_engine()
    
    def _setup_engine(self):
        """设置数据库引擎"""
        try:
            # SQLite 配置
            if self.database_url.startswith('sqlite'):
                self.engine = create_engine(
                    self.database_url,
                    echo=False,
                    connect_args={"check_same_thread": False}
                )
            else:
                # PostgreSQL 配置
                self.engine = create_engine(
                    self.database_url,
                    pool_size=20,
                    max_overflow=10,
                    pool_timeout=30,
                    pool_recycle=1800,
                    echo=False
                )
            self.session_factory = sessionmaker(
                bind=self.engine,
                autoflush=False,
                autocommit=False,
                expire_on_commit=False
            )
            logger.info("Database engine setup successfully")
        except Exception as e:
            logger.error(f"Failed to setup database engine: {e}")
            raise
    
    @contextmanager
    def get_session(self):
        """获取数据库会话"""
        session = self.session_factory()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            logger.error(f"Database session error: {e}")
            raise
        finally:
            session.close()
    
    def create_tables(self):
        """创建所有表"""
        try:
            Base.metadata.create_all(self.engine)
            logger.info("All database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create tables: {e}")
            raise
    
    def drop_tables(self):
        """删除所有表（开发环境使用）"""
        try:
            Base.metadata.drop_all(self.engine)
            logger.warning("All database tables dropped")
        except Exception as e:
            logger.error(f"Failed to drop tables: {e}")
            raise
    
    def health_check(self) -> bool:
        """数据库健康检查"""
        try:
            with self.engine.connect() as conn:
                conn.execute("SELECT 1")
            return True
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False


# 全局数据库服务实例
db_service = DatabaseService()


def get_db():
    """获取数据库会话的依赖函数"""
    with db_service.get_session() as session:
        yield session