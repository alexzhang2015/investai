import React, { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Briefcase, DollarSign } from 'lucide-react';
import { tradingAPI } from '../services/api';
import { Portfolio as PortfolioType, Position } from '../types';

const Portfolio: React.FC = () => {
  const [portfolios, setPortfolios] = useState<PortfolioType[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<PortfolioType | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [initialCash, setInitialCash] = useState('100000');

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (selectedPortfolio) {
      loadPositions(selectedPortfolio.id);
    }
  }, [selectedPortfolio]);

  const loadPortfolios = async () => {
    try {
      const data = await tradingAPI.getPortfolios();
      setPortfolios(data);
      if (data.length > 0 && !selectedPortfolio) {
        setSelectedPortfolio(data[0]);
      }
    } catch (error) {
      console.error('Failed to load portfolios:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPositions = async (portfolioId: string) => {
    try {
      const data = await tradingAPI.getPositions(portfolioId);
      setPositions(data);
    } catch (error) {
      console.error('Failed to load positions:', error);
    }
  };

  const handleCreatePortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPortfolioName.trim()) return;

    try {
      const newPortfolio = await tradingAPI.createPortfolio({
        name: newPortfolioName,
        initial_cash: parseFloat(initialCash),
      });
      setPortfolios([...portfolios, newPortfolio]);
      setSelectedPortfolio(newPortfolio);
      setNewPortfolioName('');
      setInitialCash('100000');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create portfolio:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">投资组合</h1>
            <p className="text-gray-600">管理您的股票投资组合和持仓</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-2 btn-primary"
          >
            <Plus className="h-4 w-4" />
            <span>创建投资组合</span>
          </button>
        </div>
      </div>

      {/* 投资组合选择器 */}
      <div className="mb-8">
        <div className="flex space-x-4 overflow-x-auto pb-2">
          {portfolios.map((portfolio) => (
            <div
              key={portfolio.id}
              onClick={() => setSelectedPortfolio(portfolio)}
              className={`flex-shrink-0 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedPortfolio?.id === portfolio.id
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h3 className="font-medium text-gray-900">{portfolio.name}</h3>
              <div className="mt-2 space-y-1">
                <div className="text-sm text-gray-600">
                  总资产: {formatCurrency(portfolio.total_value)}
                </div>
                <div className={`text-sm ${getChangeColor(portfolio.total_return)}`}>
                  {formatPercent(portfolio.total_return_percent)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedPortfolio && (
        <>
          {/* 投资组合概览 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Briefcase className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总资产</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedPortfolio.total_value)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">现金余额</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(selectedPortfolio.cash_balance)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">总收益</p>
                  <p className={`text-2xl font-bold ${getChangeColor(selectedPortfolio.total_return)}`}>
                    {formatCurrency(selectedPortfolio.total_return)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  {selectedPortfolio.total_return >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-purple-600" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-purple-600" />
                  )}
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">收益率</p>
                  <p className={`text-2xl font-bold ${getChangeColor(selectedPortfolio.total_return_percent)}`}>
                    {formatPercent(selectedPortfolio.total_return_percent)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 持仓列表 */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">持仓详情</h2>
            </div>
            <div className="overflow-x-auto">
              {positions.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">暂无持仓</p>
                  <p className="text-sm text-gray-500 mt-1">开始您的第一笔投资吧！</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        股票
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        持股数
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        平均成本
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        当前价格
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        市值
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        盈亏
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        盈亏率
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {positions.map((position) => (
                      <tr key={position.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {position.symbol}
                            </div>
                            <div className="text-sm text-gray-500">
                              {position.stock_name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {position.shares}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(position.average_cost)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(position.current_price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(position.market_value)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getChangeColor(position.unrealized_pnl)}`}>
                          {formatCurrency(position.unrealized_pnl)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${getChangeColor(position.unrealized_pnl_percent)}`}>
                          {formatPercent(position.unrealized_pnl_percent)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {/* 创建投资组合弹窗 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">创建新的投资组合</h3>
            <form onSubmit={handleCreatePortfolio} className="space-y-4">
              <div>
                <label htmlFor="portfolioName" className="block text-sm font-medium text-gray-700 mb-1">
                  投资组合名称
                </label>
                <input
                  id="portfolioName"
                  type="text"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  className="input-field"
                  placeholder="输入投资组合名称"
                  required
                />
              </div>
              <div>
                <label htmlFor="initialCash" className="block text-sm font-medium text-gray-700 mb-1">
                  初始资金
                </label>
                <input
                  id="initialCash"
                  type="number"
                  value={initialCash}
                  onChange={(e) => setInitialCash(e.target.value)}
                  className="input-field"
                  placeholder="输入初始资金"
                  min="1000"
                  step="1000"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
                >
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio;