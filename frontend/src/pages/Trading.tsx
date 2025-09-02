import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react';
import { tradingAPI } from '../services/api';
import { Portfolio, TradeRequest, MarketData } from '../types';

const tradeSchema = z.object({
  portfolio_id: z.string().min(1, '请选择投资组合'),
  symbol: z.string().min(1, '请输入股票代码'),
  trade_type: z.enum(['buy', 'sell'], { required_error: '请选择交易类型' }),
  shares: z.number().min(1, '股数必须大于0'),
  order_type: z.enum(['market', 'limit'], { required_error: '请选择订单类型' }),
  limit_price: z.number().optional(),
});

type TradeFormData = z.infer<typeof tradeSchema>;

const Trading: React.FC = () => {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ symbol: string; name: string }[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
  });

  const watchOrderType = watch('order_type');
  const watchSymbol = watch('symbol');
  const watchShares = watch('shares');
  const selectedPortfolioId = watch('portfolio_id');

  useEffect(() => {
    loadPortfolios();
  }, []);

  useEffect(() => {
    if (watchSymbol && watchSymbol !== selectedSymbol) {
      setSelectedSymbol(watchSymbol);
      loadMarketData(watchSymbol);
    }
  }, [watchSymbol, selectedSymbol]);

  const loadPortfolios = async () => {
    try {
      const data = await tradingAPI.getPortfolios();
      setPortfolios(data);
      if (data.length > 0) {
        setValue('portfolio_id', data[0].id);
      }
    } catch (error) {
      console.error('Failed to load portfolios:', error);
    }
  };

  const loadMarketData = async (symbol: string) => {
    try {
      const data = await tradingAPI.getMarketData(symbol);
      setMarketData(data);
    } catch (error) {
      console.error('Failed to load market data:', error);
      setMarketData(null);
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await tradingAPI.searchStocks(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Failed to search stocks:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectStock = (symbol: string, name: string) => {
    setValue('symbol', symbol);
    setSearchQuery(`${symbol} - ${name}`);
    setSearchResults([]);
    loadMarketData(symbol);
  };

  const onSubmit = async (data: TradeFormData) => {
    setIsSubmitting(true);
    try {
      const tradeRequest: TradeRequest = {
        portfolio_id: data.portfolio_id,
        symbol: data.symbol,
        trade_type: data.trade_type,
        shares: data.shares,
        order_type: data.order_type,
        limit_price: data.limit_price,
      };

      await tradingAPI.submitTrade(tradeRequest);
      
      // 重置表单
      reset();
      setSearchQuery('');
      setMarketData(null);
      setSelectedSymbol('');
      
      alert('交易订单已提交成功！');
    } catch (error: any) {
      console.error('Failed to submit trade:', error);
      alert(error.response?.data?.detail || '交易提交失败');
    } finally {
      setIsSubmitting(false);
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

  const calculateEstimatedTotal = () => {
    if (!marketData || !watchShares) return 0;
    const price = watchOrderType === 'limit' ? (watch('limit_price') || 0) : marketData.current_price;
    return watchShares * price;
  };

  const selectedPortfolio = portfolios.find(p => p.id === selectedPortfolioId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">股票交易</h1>
        <p className="text-gray-600">买卖股票，管理您的投资</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 交易表单 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">下单交易</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* 投资组合选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投资组合
              </label>
              <select
                {...register('portfolio_id')}
                className="input-field"
              >
                <option value="">选择投资组合</option>
                {portfolios.map((portfolio) => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name} (现金: {formatCurrency(portfolio.cash_balance)})
                  </option>
                ))}
              </select>
              {errors.portfolio_id && (
                <p className="mt-1 text-sm text-red-600">{errors.portfolio_id.message}</p>
              )}
            </div>

            {/* 股票搜索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                股票代码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearch(e.target.value);
                  }}
                  className="input-field pl-9"
                  placeholder="搜索股票代码或名称"
                />
                <input
                  {...register('symbol')}
                  type="hidden"
                />
                
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((result) => (
                      <button
                        key={result.symbol}
                        type="button"
                        onClick={() => handleSelectStock(result.symbol, result.name)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-gray-900">{result.symbol}</div>
                        <div className="text-sm text-gray-600">{result.name}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.symbol && (
                <p className="mt-1 text-sm text-red-600">{errors.symbol.message}</p>
              )}
            </div>

            {/* 交易类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                交易类型
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="buy"
                    {...register('trade_type')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-green-600 font-medium">买入</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="sell"
                    {...register('trade_type')}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-red-600 font-medium">卖出</span>
                </label>
              </div>
              {errors.trade_type && (
                <p className="mt-1 text-sm text-red-600">{errors.trade_type.message}</p>
              )}
            </div>

            {/* 股数 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                股数
              </label>
              <input
                type="number"
                {...register('shares', { valueAsNumber: true })}
                className="input-field"
                placeholder="输入股数"
                min="1"
                step="1"
              />
              {errors.shares && (
                <p className="mt-1 text-sm text-red-600">{errors.shares.message}</p>
              )}
            </div>

            {/* 订单类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                订单类型
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="market"
                    {...register('order_type')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">市价单</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="limit"
                    {...register('order_type')}
                    className="text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">限价单</span>
                </label>
              </div>
              {errors.order_type && (
                <p className="mt-1 text-sm text-red-600">{errors.order_type.message}</p>
              )}
            </div>

            {/* 限价 */}
            {watchOrderType === 'limit' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  限价
                </label>
                <input
                  type="number"
                  {...register('limit_price', { valueAsNumber: true })}
                  className="input-field"
                  placeholder="输入限价"
                  min="0.01"
                  step="0.01"
                />
                {errors.limit_price && (
                  <p className="mt-1 text-sm text-red-600">{errors.limit_price.message}</p>
                )}
              </div>
            )}

            {/* 预估总额 */}
            {marketData && watchShares && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">预估总额:</span>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatCurrency(calculateEstimatedTotal())}
                  </span>
                </div>
                {selectedPortfolio && (
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">可用现金:</span>
                    <span className="text-sm text-gray-900">
                      {formatCurrency(selectedPortfolio.cash_balance)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !marketData}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '提交中...' : '提交订单'}
            </button>
          </form>
        </div>

        {/* 股票信息 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">股票信息</h2>
          
          {marketData ? (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900">{marketData.symbol}</h3>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {formatCurrency(marketData.current_price)}
                </p>
                <div className={`flex items-center justify-center space-x-2 mt-2 ${getChangeColor(marketData.change)}`}>
                  {marketData.change >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="font-medium">
                    {formatCurrency(Math.abs(marketData.change))}
                  </span>
                  <span className="font-medium">
                    ({formatPercent(marketData.change_percent)})
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">成交量</span>
                  </div>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    {marketData.volume.toLocaleString()}
                  </p>
                </div>

                {marketData.market_cap && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">市值</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {formatCurrency(marketData.market_cap)}
                    </p>
                  </div>
                )}

                {marketData.pe_ratio && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">市盈率</span>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mt-1">
                      {marketData.pe_ratio.toFixed(2)}
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">更新时间</span>
                  </div>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(marketData.updated_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">搜索股票查看详细信息</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Trading;