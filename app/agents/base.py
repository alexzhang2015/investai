"""
Base Agent framework for InvestAI
"""
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import asyncio
import json
import redis
from loguru import logger


@dataclass
class AgentTask:
    """Agent任务定义"""
    task_id: str
    task_type: str
    input_data: Dict[str, Any]
    priority: int = 1
    timeout: int = 300  # 5分钟超时
    created_at: datetime = datetime.now()


@dataclass
class AgentResult:
    """Agent执行结果"""
    task_id: str
    success: bool
    data: Dict[str, Any]
    error_msg: Optional[str] = None
    execution_time: float = 0.0
    timestamp: datetime = datetime.now()


class BaseAgent(ABC):
    """基础Agent类"""
    
    def __init__(self, name: str, config: Dict[str, Any]):
        self.name = name
        self.config = config
        self.redis_client = self._init_redis()
        self.llm = self._init_llm() if hasattr(self, '_init_llm') else None
        self.tools = self._init_tools() if hasattr(self, '_init_tools') else None
    
    def _init_redis(self) -> Optional[redis.Redis]:
        """初始化Redis连接"""
        try:
            redis_url = self.config.get('REDIS_URL', 'redis://localhost:6379/0')
            return redis.Redis.from_url(redis_url, decode_responses=True)
        except Exception as e:
            logger.warning(f"Failed to initialize Redis, continuing without cache: {e}")
            return None
    
    @abstractmethod
    async def execute(self, task: AgentTask) -> AgentResult:
        """执行Agent任务"""
        pass
    
    def _cache_result(self, key: str, data: Dict, expire_seconds: int = 3600) -> bool:
        """缓存结果"""
        try:
            if self.redis_client:
                serialized_data = json.dumps(data, default=str)
                return self.redis_client.setex(key, expire_seconds, serialized_data)
            return False
        except Exception as e:
            logger.warning(f"Failed to cache result: {e}")
            return False
    
    def _get_cached_result(self, key: str) -> Optional[Dict]:
        """获取缓存结果"""
        try:
            if self.redis_client:
                cached = self.redis_client.get(key)
                return json.loads(cached) if cached else None
            return None
        except Exception as e:
            logger.warning(f"Failed to get cached result: {e}")
            return None
    
    def _generate_task_id(self, prefix: str = "task") -> str:
        """生成任务ID"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"{prefix}_{timestamp}_{id(self)}"
    
    async def _execute_with_timeout(self, coro, timeout: int) -> Any:
        """带超时的协程执行"""
        try:
            return await asyncio.wait_for(coro, timeout=timeout)
        except asyncio.TimeoutError:
            logger.error(f"Task timed out after {timeout} seconds")
            raise
        except Exception as e:
            logger.error(f"Task execution failed: {e}")
            raise


class AgentOrchestrator:
    """Agent编排器"""
    
    def __init__(self, config: Dict[str, Any] = {}):
        self.agents: Dict[str, BaseAgent] = {}
        self.task_queue = asyncio.Queue()
        self.results: Dict[str, AgentResult] = {}
        self.config = config
    
    def register_agent(self, agent: BaseAgent) -> None:
        """注册Agent"""
        self.agents[agent.name] = agent
        logger.info(f"Registered agent: {agent.name}")
    
    async def execute_workflow(self, workflow: List[AgentTask]) -> Dict[str, AgentResult]:
        """执行工作流"""
        results = {}
        
        for task in workflow:
            if task.task_type not in self.agents:
                logger.error(f"No agent registered for task type: {task.task_type}")
                continue
            
            agent = self.agents[task.task_type]
            try:
                result = await agent.execute(task)
                results[task.task_id] = result
                
                if not result.success:
                    logger.warning(f"Task {task.task_id} failed: {result.error_msg}")
                    # 可以根据需要决定是否继续执行后续任务
                    
            except Exception as e:
                logger.error(f"Task {task.task_id} execution error: {e}")
                results[task.task_id] = AgentResult(
                    task_id=task.task_id,
                    success=False,
                    data={},
                    error_msg=str(e)
                )
        
        return results
    
    async def execute_full_analysis(self, analysis_data: Dict[str, Any]) -> Dict[str, Any]:
        """执行完整的股票分析工作流"""
        stock_code = analysis_data.get('stock_code')
        analysis_types = analysis_data.get('analysis_types', ['fundamental', 'technical', 'sentiment'])
        
        if not stock_code:
            raise ValueError("Stock code is required for analysis")
        
        # 创建数据收集任务
        data_collection_task = AgentTask(
            task_id=f"data_collect_{stock_code}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            task_type="data_collection",
            input_data={
                'stock_code': stock_code,
                'data_types': ['price', 'financial', 'news', 'technical']
            }
        )
        
        # 执行数据收集
        data_result = await self.agents['data_collector'].execute(data_collection_task)
        if not data_result.success:
            raise Exception(f"Data collection failed: {data_result.error_msg}")
        
        collected_data = data_result.data
        
        # 执行各种分析
        analysis_results = {}
        
        if 'fundamental' in analysis_types:
            fundamental_task = AgentTask(
                task_id=f"fundamental_{stock_code}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                task_type="fundamental_analysis",
                input_data={
                    'stock_code': stock_code,
                    'financial_data': collected_data.get('financial_data', {})
                }
            )
            fundamental_result = await self.agents['fundamental_analyst'].execute(fundamental_task)
            if fundamental_result.success:
                analysis_results['fundamental'] = fundamental_result.data
        
        if 'technical' in analysis_types:
            technical_task = AgentTask(
                task_id=f"technical_{stock_code}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                task_type="technical_analysis",
                input_data={
                    'stock_code': stock_code,
                    'price_data': collected_data.get('price_data', {})
                }
            )
            technical_result = await self.agents['technical_analyst'].execute(technical_task)
            if technical_result.success:
                analysis_results['technical'] = technical_result.data
        
        if 'sentiment' in analysis_types:
            sentiment_task = AgentTask(
                task_id=f"sentiment_{stock_code}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                task_type="sentiment_analysis",
                input_data={
                    'stock_code': stock_code,
                    'news_data': collected_data.get('news_data', [])
                }
            )
            sentiment_result = await self.agents['sentiment_analyst'].execute(sentiment_task)
            if sentiment_result.success:
                analysis_results['sentiment'] = sentiment_result.data
        
        # 执行策略生成
        strategy_task = AgentTask(
            task_id=f"strategy_{stock_code}_{datetime.now().strftime('%Y%m%d%H%M%S')}",
            task_type="strategy_generation",
            input_data={
                'stock_code': stock_code,
                'analysis_results': analysis_results,
                'risk_profile': 'moderate',  # 默认中等风险
                'current_price': collected_data.get('price_data', {}).get('current_price', 0)
            }
        )
        
        strategy_result = await self.agents['strategy_generator'].execute(strategy_task)
        if not strategy_result.success:
            raise Exception(f"Strategy generation failed: {strategy_result.error_msg}")
        
        # 合并所有结果
        final_result = {
            'collected_data': collected_data,
            'analysis_results': analysis_results,
            'strategy_result': strategy_result.data,
            'timestamp': datetime.now().isoformat(),
            'stock_code': stock_code
        }
        
        return final_result
    
    async def process_queue(self) -> None:
        """处理任务队列"""
        while True:
            try:
                task = await self.task_queue.get()
                if task is None:  # 终止信号
                    break
                
                if task.task_type in self.agents:
                    agent = self.agents[task.task_type]
                    result = await agent.execute(task)
                    self.results[task.task_id] = result
                    
                    if not result.success:
                        logger.error(f"Queue task failed: {result.error_msg}")
                
                self.task_queue.task_done()
                
            except Exception as e:
                logger.error(f"Queue processing error: {e}")
    
    def submit_task(self, task: AgentTask) -> None:
        """提交任务到队列"""
        self.task_queue.put_nowait(task)
    
    def get_result(self, task_id: str) -> Optional[AgentResult]:
        """获取任务结果"""
        return self.results.get(task_id)
    
    async def shutdown(self) -> None:
        """关闭编排器"""
        # 发送终止信号
        await self.task_queue.put(None)
        # 等待所有任务完成
        await self.task_queue.join()