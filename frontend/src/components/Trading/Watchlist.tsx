import React, { useState, useEffect } from 'react';
import { Star, Plus, X, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { tradingAPI } from '../../services/api';
import { Watchlist as WatchlistType, MarketData } from '../../types';

interface WatchlistProps {
  onSelectStock?: (symbol: string) => void;
}

const Watchlist: React.FC<WatchlistProps> = ({ onSelectStock }) => {
  const [watchlists, setWatchlists] = useState<WatchlistType[]>([]);
  const [marketData, setMarketData] = useState<Record<string, MarketData>>({});
  const [selectedWatchlist, setSelectedWatchlist] = useState<WatchlistType | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWatchlists();
  }, []);

  useEffect(() => {
    if (selectedWatchlist && selectedWatchlist.symbols.length > 0) {
      loadMarketData(selectedWatchlist.symbols);
    }
  }, [selectedWatchlist]);

  const loadWatchlists = async () => {
    try {
      const data = await tradingAPI.getWatchlists();
      setWatchlists(data);
      if (data.length > 0) {
        setSelectedWatchlist(data[0]);
      }
    } catch (error) {
      console.error('Failed to load watchlists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMarketData = async (symbols: string[]) => {
    try {
      const data = await tradingAPI.getMultipleMarketData(symbols);
      const dataMap = data.reduce((acc, item) => {
        acc[item.symbol] = item;
        return acc;
      }, {} as Record<string, MarketData>);
      setMarketData(dataMap);
    } catch (error) {
      console.error('Failed to load market data:', error);
    }
  };

  const handleCreateWatchlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWatchlistName.trim()) return;

    try {
      const newWatchlist = await tradingAPI.createWatchlist({
        name: newWatchlistName,
        symbols: [],
      });
      setWatchlists([...watchlists, newWatchlist]);
      setSelectedWatchlist(newWatchlist);
      setNewWatchlistName('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Failed to create watchlist:', error);
    }
  };

  const handleRemoveFromWatchlist = async (symbol: string) => {
    if (!selectedWatchlist) return;

    try {
      const updated = await tradingAPI.removeFromWatchlist(selectedWatchlist.id, symbol);
      setSelectedWatchlist(updated);
      setWatchlists(watchlists.map(w => w.id === updated.id ? updated : w));
    } catch (error) {
      console.error('Failed to remove from watchlist:', error);
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
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">股票关注列表</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
          >
            <Plus className="h-4 w-4" />
            <span>新建列表</span>
          </button>
        </div>

        {/* 关注列表选择器 */}
        {watchlists.length > 0 && (
          <div className="mt-4">
            <div className="flex space-x-2 overflow-x-auto">
              {watchlists.map((watchlist) => (
                <button
                  key={watchlist.id}
                  onClick={() => setSelectedWatchlist(watchlist)}
                  className={`flex-shrink-0 px-3 py-1 text-sm rounded-lg border transition-colors ${
                    selectedWatchlist?.id === watchlist.id
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {watchlist.name} ({watchlist.symbols.length})
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-6">
        {selectedWatchlist ? (
          selectedWatchlist.symbols.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">关注列表为空</p>
              <p className="text-sm text-gray-500 mt-1">添加股票到您的关注列表</p>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedWatchlist.symbols.map((symbol) => {
                const data = marketData[symbol];
                return (
                  <div
                    key={symbol}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">{symbol}</h3>
                        {data && (
                          <>
                            <span className="text-lg font-semibold text-gray-900">
                              {formatCurrency(data.current_price)}
                            </span>
                            <div className={`flex items-center space-x-1 ${getChangeColor(data.change)}`}>
                              {data.change >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              <span className="text-sm font-medium">
                                {formatPercent(data.change_percent)}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      {data && (
                        <div className="text-sm text-gray-500 mt-1">
                          成交量: {data.volume.toLocaleString()} | 
                          更新: {new Date(data.updated_at).toLocaleString('zh-CN')}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {onSelectStock && (
                        <button
                          onClick={() => onSelectStock(symbol)}
                          className="p-2 text-gray-400 hover:text-primary-600"
                          title="分析此股票"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveFromWatchlist(symbol)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="从关注列表中移除"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="text-center py-8">
            <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">暂无关注列表</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-2 text-sm text-primary-600 hover:text-primary-700"
            >
              创建您的第一个关注列表
            </button>
          </div>
        )}
      </div>

      {/* 创建关注列表弹窗 */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">创建关注列表</h3>
            <form onSubmit={handleCreateWatchlist} className="space-y-4">
              <div>
                <label htmlFor="watchlistName" className="block text-sm font-medium text-gray-700 mb-1">
                  列表名称
                </label>
                <input
                  id="watchlistName"
                  type="text"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  className="input-field"
                  placeholder="输入关注列表名称"
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

export default Watchlist;