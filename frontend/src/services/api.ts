import axios from 'axios';
import { 
  StockAnalysisRequest, 
  AnalysisResult, 
  AnalysisHistory, 
  User,
  Portfolio,
  Position,
  Trade,
  TradeRequest,
  MarketData,
  Watchlist
} from '../types';

const API_BASE_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器：添加认证token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器：处理认证错误
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: async (userData: {
    username: string;
    email: string;
    password: string;
    full_name: string;
  }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  login: async (credentials: {
    username: string;
    password: string;
  }) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (profileData: {
    full_name: string;
    email: string;
  }) => {
    const response = await api.put('/auth/profile', profileData);
    return response.data;
  },

  changePassword: async (passwordData: {
    current_password: string;
    new_password: string;
  }) => {
    const response = await api.post('/auth/change-password', passwordData);
    return response.data;
  },
};

export const analysisAPI = {
  analyzeStock: async (request: { stock_code: string; analysis_types: string[] }): Promise<AnalysisResult> => {
    const response = await api.post('/analysis/stock', request);
    return response.data;
  },

  getAnalysisResult: async (taskId: string): Promise<AnalysisResult> => {
    const response = await api.get(`/analysis/stock/${taskId}`);
    return response.data;
  },

  getHistory: async (): Promise<InvestmentRecommendation[]> => {
    const response = await api.get('/analysis/history');
    return response.data;
  },

  getAnalysisHistory: async (): Promise<AnalysisHistory[]> => {
    const response = await api.get('/analysis/history');
    return response.data;
  },
};

export const tradingAPI = {
  // 投资组合管理
  getPortfolios: async (): Promise<Portfolio[]> => {
    const response = await api.get('/trading/portfolios');
    return response.data;
  },

  createPortfolio: async (portfolioData: { name: string; initial_cash: number }): Promise<Portfolio> => {
    const response = await api.post('/trading/portfolios', portfolioData);
    return response.data;
  },

  getPortfolio: async (portfolioId: string): Promise<Portfolio> => {
    const response = await api.get(`/trading/portfolios/${portfolioId}`);
    return response.data;
  },

  updatePortfolio: async (portfolioId: string, portfolioData: { name?: string }): Promise<Portfolio> => {
    const response = await api.put(`/trading/portfolios/${portfolioId}`, portfolioData);
    return response.data;
  },

  deletePortfolio: async (portfolioId: string): Promise<void> => {
    await api.delete(`/trading/portfolios/${portfolioId}`);
  },

  // 持仓管理
  getPositions: async (portfolioId: string): Promise<Position[]> => {
    const response = await api.get(`/trading/portfolios/${portfolioId}/positions`);
    return response.data;
  },

  // 交易管理
  submitTrade: async (tradeRequest: TradeRequest): Promise<Trade> => {
    const response = await api.post('/trading/trades', tradeRequest);
    return response.data;
  },

  getTrades: async (portfolioId?: string): Promise<Trade[]> => {
    const url = portfolioId ? `/trading/trades?portfolio_id=${portfolioId}` : '/trading/trades';
    const response = await api.get(url);
    return response.data;
  },

  getTrade: async (tradeId: string): Promise<Trade> => {
    const response = await api.get(`/trading/trades/${tradeId}`);
    return response.data;
  },

  cancelTrade: async (tradeId: string): Promise<Trade> => {
    const response = await api.post(`/trading/trades/${tradeId}/cancel`);
    return response.data;
  },

  // 市场数据
  getMarketData: async (symbol: string): Promise<MarketData> => {
    const response = await api.get(`/market/data/${symbol}`);
    return response.data;
  },

  getMultipleMarketData: async (symbols: string[]): Promise<MarketData[]> => {
    const response = await api.post('/market/data/batch', { symbols });
    return response.data;
  },

  searchStocks: async (query: string): Promise<{ symbol: string; name: string }[]> => {
    const response = await api.get(`/market/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  // 关注列表
  getWatchlists: async (): Promise<Watchlist[]> => {
    const response = await api.get('/trading/watchlists');
    return response.data;
  },

  createWatchlist: async (watchlistData: { name: string; symbols?: string[] }): Promise<Watchlist> => {
    const response = await api.post('/trading/watchlists', watchlistData);
    return response.data;
  },

  updateWatchlist: async (watchlistId: string, watchlistData: { name?: string; symbols?: string[] }): Promise<Watchlist> => {
    const response = await api.put(`/trading/watchlists/${watchlistId}`, watchlistData);
    return response.data;
  },

  deleteWatchlist: async (watchlistId: string): Promise<void> => {
    await api.delete(`/trading/watchlists/${watchlistId}`);
  },

  addToWatchlist: async (watchlistId: string, symbol: string): Promise<Watchlist> => {
    const response = await api.post(`/trading/watchlists/${watchlistId}/symbols`, { symbol });
    return response.data;
  },

  removeFromWatchlist: async (watchlistId: string, symbol: string): Promise<Watchlist> => {
    const response = await api.delete(`/trading/watchlists/${watchlistId}/symbols/${symbol}`);
    return response.data;
  },
};

export const healthAPI = {
  checkHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;