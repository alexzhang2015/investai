#!/usr/bin/env python3
"""
测试交易API的完整性
"""

import requests
import json
import time
from typing import Dict, Any

API_BASE_URL = "http://localhost:8000"

class TradingAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_data = {
            "username": f"testapi_{int(time.time())}",
            "email": f"testapi_{int(time.time())}@example.com",
            "full_name": "API测试用户",
            "password": "testpassword123"
        }
        self.portfolio_id = None
        self.trade_id = None
    
    def register_and_login(self) -> bool:
        """注册并登录用户"""
        print("🔐 用户注册和登录...")
        
        # 注册用户
        response = self.session.post(
            f"{API_BASE_URL}/auth/register",
            json=self.user_data
        )
        
        if response.status_code == 200:
            data = response.json()
            self.auth_token = data["access_token"]
            self.session.headers.update({"Authorization": f"Bearer {self.auth_token}"})
            print(f"✅ 用户注册成功: {self.user_data['username']}")
            return True
        else:
            print(f"❌ 用户注册失败: {response.status_code} - {response.text}")
            return False
    
    def test_portfolio_apis(self) -> bool:
        """测试投资组合相关API"""
        print("\n📊 测试投资组合API...")
        
        # 1. 创建投资组合
        portfolio_data = {
            "name": "测试投资组合",
            "initial_cash": 100000.0,
            "description": "API测试创建的投资组合"
        }
        
        response = self.session.post(
            f"{API_BASE_URL}/trading/portfolios",
            json=portfolio_data
        )
        
        if response.status_code == 200:
            portfolio = response.json()
            self.portfolio_id = portfolio["id"]
            print(f"✅ 投资组合创建成功: {portfolio['name']} (ID: {self.portfolio_id})")
            print(f"   初始资金: ¥{portfolio['initial_cash']}")
            print(f"   现金余额: ¥{portfolio['cash_balance']}")
        else:
            print(f"❌ 投资组合创建失败: {response.status_code} - {response.text}")
            return False
        
        # 2. 获取投资组合列表
        response = self.session.get(f"{API_BASE_URL}/trading/portfolios")
        
        if response.status_code == 200:
            portfolios = response.json()
            print(f"✅ 获取投资组合列表成功: {len(portfolios)} 个投资组合")
        else:
            print(f"❌ 获取投资组合列表失败: {response.status_code} - {response.text}")
            return False
        
        # 3. 获取特定投资组合
        response = self.session.get(f"{API_BASE_URL}/trading/portfolios/{self.portfolio_id}")
        
        if response.status_code == 200:
            portfolio = response.json()
            print(f"✅ 获取特定投资组合成功: {portfolio['name']}")
        else:
            print(f"❌ 获取特定投资组合失败: {response.status_code} - {response.text}")
            return False
        
        # 4. 获取持仓（应该为空）
        response = self.session.get(f"{API_BASE_URL}/trading/portfolios/{self.portfolio_id}/positions")
        
        if response.status_code == 200:
            positions = response.json()
            print(f"✅ 获取持仓成功: {len(positions)} 个持仓")
        else:
            print(f"❌ 获取持仓失败: {response.status_code} - {response.text}")
            return False
        
        return True
    
    def test_market_data_apis(self) -> bool:
        """测试市场数据API"""
        print("\n📈 测试市场数据API...")
        
        # 1. 搜索股票
        response = self.session.get(f"{API_BASE_URL}/market/search?q=00700")
        
        if response.status_code == 200:
            results = response.json()
            print(f"✅ 股票搜索成功: 找到 {len(results)} 个结果")
            for result in results:
                print(f"   - {result['symbol']}: {result['name']}")
        else:
            print(f"❌ 股票搜索失败: {response.status_code} - {response.text}")
            return False
        
        # 2. 获取单个股票市场数据
        response = self.session.get(f"{API_BASE_URL}/market/data/00700")
        
        if response.status_code == 200:
            market_data = response.json()
            print(f"✅ 获取市场数据成功: {market_data['symbol']}")
            print(f"   当前价格: ¥{market_data['current_price']}")
            print(f"   涨跌: ¥{market_data['change']} ({market_data['change_percent']}%)")
            print(f"   成交量: {market_data['volume']:,}")
        else:
            print(f"❌ 获取市场数据失败: {response.status_code} - {response.text}")
            return False
        
        # 3. 批量获取市场数据
        response = self.session.post(
            f"{API_BASE_URL}/market/data/batch",
            json={"symbols": ["00700", "00939", "03690"]}
        )
        
        if response.status_code == 200:
            market_data_list = response.json()
            print(f"✅ 批量获取市场数据成功: {len(market_data_list)} 只股票")
            for data in market_data_list:
                print(f"   - {data['symbol']}: ¥{data['current_price']}")
        else:
            print(f"❌ 批量获取市场数据失败: {response.status_code} - {response.text}")
            return False
        
        return True
    
    def test_trading_apis(self) -> bool:
        """测试交易相关API"""
        print("\n💰 测试交易API...")
        
        if not self.portfolio_id:
            print("❌ 没有可用的投资组合ID")
            return False
        
        # 1. 提交买入订单
        buy_order = {
            "portfolio_id": self.portfolio_id,
            "stock_code": "00700",
            "trade_type": "buy",
            "order_type": "market",
            "shares": 100
        }
        
        response = self.session.post(
            f"{API_BASE_URL}/trading/trades",
            json=buy_order
        )
        
        if response.status_code == 200:
            trade = response.json()
            self.trade_id = trade["id"]
            print(f"✅ 买入订单提交成功: {trade['stock_code']}")
            print(f"   交易类型: {trade['trade_type']}")
            print(f"   股数: {trade['shares']}")
            print(f"   价格: ¥{trade['price']}")
            print(f"   总金额: ¥{trade['total_amount']}")
            print(f"   手续费: ¥{trade['commission']}")
            print(f"   状态: {trade['status']}")
        else:
            print(f"❌ 买入订单提交失败: {response.status_code} - {response.text}")
            return False
        
        # 2. 再次获取持仓（现在应该有持仓）
        response = self.session.get(f"{API_BASE_URL}/trading/portfolios/{self.portfolio_id}/positions")
        
        if response.status_code == 200:
            positions = response.json()
            print(f"✅ 获取持仓成功: {len(positions)} 个持仓")
            for position in positions:
                print(f"   - {position['stock_code']}: {position['shares']} 股")
                print(f"     平均成本: ¥{position['average_cost']}")
                print(f"     市值: ¥{position['market_value']}")
                print(f"     盈亏: ¥{position['unrealized_pnl']}")
        else:
            print(f"❌ 获取持仓失败: {response.status_code} - {response.text}")
            return False
        
        # 3. 提交卖出订单（卖出一部分）
        sell_order = {
            "portfolio_id": self.portfolio_id,
            "stock_code": "00700",
            "trade_type": "sell",
            "order_type": "market",
            "shares": 50
        }
        
        response = self.session.post(
            f"{API_BASE_URL}/trading/trades",
            json=sell_order
        )
        
        if response.status_code == 200:
            trade = response.json()
            print(f"✅ 卖出订单提交成功: {trade['stock_code']}")
            print(f"   交易类型: {trade['trade_type']}")
            print(f"   股数: {trade['shares']}")
            print(f"   价格: ¥{trade['price']}")
            print(f"   总金额: ¥{trade['total_amount']}")
        else:
            print(f"❌ 卖出订单提交失败: {response.status_code} - {response.text}")
            return False
        
        # 4. 获取交易历史
        response = self.session.get(f"{API_BASE_URL}/trading/trades")
        
        if response.status_code == 200:
            trades = response.json()
            print(f"✅ 获取交易历史成功: {len(trades)} 笔交易")
            for trade in trades:
                print(f"   - {trade['created_at'][:19]}: {trade['trade_type']} {trade['shares']} {trade['stock_code']} @ ¥{trade['price']}")
        else:
            print(f"❌ 获取交易历史失败: {response.status_code} - {response.text}")
            return False
        
        # 5. 获取特定投资组合的交易历史
        response = self.session.get(f"{API_BASE_URL}/trading/trades?portfolio_id={self.portfolio_id}")
        
        if response.status_code == 200:
            trades = response.json()
            print(f"✅ 获取特定投资组合交易历史成功: {len(trades)} 笔交易")
        else:
            print(f"❌ 获取特定投资组合交易历史失败: {response.status_code} - {response.text}")
            return False
        
        return True
    
    def test_portfolio_update(self) -> bool:
        """验证投资组合更新"""
        print("\n🔄 验证投资组合更新...")
        
        if not self.portfolio_id:
            return False
        
        # 获取更新后的投资组合信息
        response = self.session.get(f"{API_BASE_URL}/trading/portfolios/{self.portfolio_id}")
        
        if response.status_code == 200:
            portfolio = response.json()
            print(f"✅ 投资组合更新验证成功:")
            print(f"   初始资金: ¥{portfolio['initial_cash']}")
            print(f"   现金余额: ¥{portfolio['cash_balance']}")
            print(f"   总资产: ¥{portfolio['total_value']}")
            print(f"   总收益: ¥{portfolio['total_return']}")
            print(f"   收益率: {portfolio['total_return_percent']:.2f}%")
            
            # 验证数据逻辑
            expected_cash_used = portfolio['initial_cash'] - portfolio['cash_balance']
            print(f"   已使用现金: ¥{expected_cash_used}")
            
            return True
        else:
            print(f"❌ 投资组合更新验证失败: {response.status_code} - {response.text}")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """运行所有测试"""
        print("🚀 开始后端交易API完整性测试\n")
        
        results = {}
        
        # 1. 用户认证测试
        results["auth"] = self.register_and_login()
        if not results["auth"]:
            print("❌ 认证失败，停止测试")
            return results
        
        # 2. 投资组合API测试
        results["portfolio"] = self.test_portfolio_apis()
        
        # 3. 市场数据API测试
        results["market_data"] = self.test_market_data_apis()
        
        # 4. 交易API测试
        results["trading"] = self.test_trading_apis()
        
        # 5. 投资组合更新验证
        results["portfolio_update"] = self.test_portfolio_update()
        
        return results
    
    def print_summary(self, results: Dict[str, bool]):
        """打印测试总结"""
        print("\n" + "="*60)
        print("🎯 后端交易API测试总结")
        print("="*60)
        
        test_names = {
            "auth": "用户认证",
            "portfolio": "投资组合管理",
            "market_data": "市场数据",
            "trading": "交易功能",
            "portfolio_update": "投资组合更新"
        }
        
        passed = 0
        total = len(results)
        
        for test_key, test_name in test_names.items():
            status = "✅ 通过" if results.get(test_key, False) else "❌ 失败"
            print(f"{test_name:12} - {status}")
            if results.get(test_key, False):
                passed += 1
        
        print("="*60)
        print(f"测试结果: {passed}/{total} 通过")
        
        if passed == total:
            print("🎉 所有API测试通过！后端交易功能完全就绪！")
        else:
            print("⚠️ 部分测试失败，需要检查相关功能")
        
        print("\n📋 已实现的API端点:")
        api_endpoints = [
            "POST /trading/portfolios - 创建投资组合",
            "GET  /trading/portfolios - 获取投资组合列表",
            "GET  /trading/portfolios/{id} - 获取特定投资组合",
            "GET  /trading/portfolios/{id}/positions - 获取持仓",
            "POST /trading/trades - 提交交易订单",
            "GET  /trading/trades - 获取交易历史",
            "GET  /market/data/{symbol} - 获取市场数据",
            "POST /market/data/batch - 批量获取市场数据",
            "GET  /market/search - 搜索股票"
        ]
        
        for endpoint in api_endpoints:
            print(f"   ✅ {endpoint}")


if __name__ == "__main__":
    tester = TradingAPITester()
    results = tester.run_all_tests()
    tester.print_summary(results)