import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Briefcase, DollarSign } from 'lucide-react';
import { analysisAPI, tradingAPI } from '../services/api';
import { InvestmentRecommendation, Portfolio } from '../types';

const Dashboard: React.FC = () => {
  const [recentAnalyses, setRecentAnalyses] = useState<InvestmentRecommendation[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [analyses, portfoliosData] = await Promise.all([
        analysisAPI.getHistory(),
        tradingAPI.getPortfolios().catch(() => [])
      ]);
      setRecentAnalyses(analyses.slice(0, 5));
      setPortfolios(portfoliosData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation?.toLowerCase() || '') {
      case 'strong buy':
        return 'text-green-600 bg-green-100';
      case 'buy':
        return 'text-blue-600 bg-blue-100';
      case 'hold':
        return 'text-yellow-600 bg-yellow-100';
      case 'sell':
        return 'text-red-600 bg-red-100';
      case 'strong sell':
        return 'text-red-800 bg-red-200';
      default:
        return 'text-gray-600 bg-gray-100';
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

  const getTotalPortfolioValue = () => {
    return portfolios.reduce((sum, portfolio) => sum + portfolio.total_value, 0);
  };

  const getTotalReturn = () => {
    return portfolios.reduce((sum, portfolio) => sum + portfolio.total_return, 0);
  };

  const getAverageReturnPercent = () => {
    if (portfolios.length === 0) return 0;
    const totalReturn = portfolios.reduce((sum, portfolio) => sum + portfolio.total_return_percent, 0);
    return totalReturn / portfolios.length;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">投资分析仪表板</h1>
        <p className="text-gray-600">欢迎使用 InvestAI，您的智能投资分析助手</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总分析次数</p>
              <p className="text-2xl font-bold text-gray-900">{recentAnalyses.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Briefcase className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">投资组合总值</p>
              <p className="text-2xl font-bold text-gray-900">
                {portfolios.length > 0 ? formatCurrency(getTotalPortfolioValue()) : '¥0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">总收益</p>
              <p className={`text-2xl font-bold ${getTotalReturn() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {portfolios.length > 0 ? formatCurrency(getTotalReturn()) : '¥0.00'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">买入推荐</p>
              <p className="text-2xl font-bold text-gray-900">
                {recentAnalyses.filter(a => a.recommendation?.toLowerCase().includes('buy')).length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">持有推荐</p>
              <p className="text-2xl font-bold text-gray-900">
                {recentAnalyses.filter(a => a.recommendation?.toLowerCase() === 'hold').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Users className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">卖出推荐</p>
              <p className="text-2xl font-bold text-gray-900">
                {recentAnalyses.filter(a => a.recommendation?.toLowerCase().includes('sell')).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">最近分析记录</h2>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">加载中...</p>
            </div>
          ) : recentAnalyses.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">暂无分析记录</p>
              <p className="text-sm text-gray-500 mt-1">开始您的第一次股票分析吧！</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      股票代码
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      股票名称
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      推荐
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      信心指数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分析时间
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentAnalyses.map((analysis) => (
                    <tr key={analysis.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {analysis.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {analysis.stock_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRecommendationColor(analysis.recommendation || '')}`}>
                          {analysis.recommendation}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {analysis.confidence_score}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(analysis.created_at).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;