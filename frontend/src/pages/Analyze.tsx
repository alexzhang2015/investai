import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BarChart3, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { analysisAPI } from '../services/api';
import { AnalysisResult } from '../types';

const analyzeSchema = z.object({
  stock_code: z.string().min(1, '股票代码不能为空').max(10, '股票代码最多10位'),
  analysis_types: z.array(z.enum(['technical', 'fundamental', 'sentiment'])).min(1, '请至少选择一种分析类型'),
});

type AnalyzeFormData = z.infer<typeof analyzeSchema>;

const Analyze: React.FC = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AnalyzeFormData>({
    resolver: zodResolver(analyzeSchema),
  });

  const onSubmit = async (data: AnalyzeFormData) => {
    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await analysisAPI.analyzeStock({
        stock_code: data.stock_code,
        analysis_types: data.analysis_types,
      });
      setResult(response);
      reset();
    } catch (error: any) {
      setError(error.response?.data?.detail || '分析失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation?.toLowerCase() || '') {
      case 'strong buy':
      case 'buy':
        return <TrendingUp className="h-6 w-6 text-green-600" />;
      case 'hold':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      case 'sell':
      case 'strong sell':
        return <TrendingDown className="h-6 w-6 text-red-600" />;
      default:
        return <BarChart3 className="h-6 w-6 text-gray-600" />;
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation?.toLowerCase() || '') {
      case 'strong buy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'buy':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'sell':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'strong sell':
        return 'bg-red-200 text-red-900 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">股票分析</h1>
        <p className="text-gray-600">使用AI技术分析股票投资价值</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">分析参数</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="stock_code" className="block text-sm font-medium text-gray-700 mb-2">
                股票代码
              </label>
              <input
                {...register('stock_code')}
                type="text"
                className="input-field"
                placeholder="例如：03690"
              />
              {errors.stock_code && (
                <p className="mt-1 text-sm text-red-600">{errors.stock_code.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                分析类型（可多选）
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    value="technical"
                    {...register('analysis_types')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">技术分析</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    value="fundamental"
                    {...register('analysis_types')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">基本面分析</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    value="sentiment"
                    {...register('analysis_types')}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">情感分析</span>
                </label>
              </div>
              {errors.analysis_types && (
                <p className="mt-1 text-sm text-red-600">{errors.analysis_types.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '分析中...' : '开始分析'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">分析结果</h2>
          
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-600">正在分析中，请稍候...</p>
            </div>
          ) : result ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{result.stock_name}</h3>
                  <p className="text-gray-600">{result.symbol}</p>
                </div>
                {getRecommendationIcon(result.recommendation)}
              </div>

              <div className={`border rounded-lg p-4 ${getRecommendationColor(result.recommendation)}`}>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">投资建议</span>
                  <span className="text-xl font-bold">{result.recommendation}</span>
                </div>
                <div className="mt-2 text-sm">
                  信心指数: {result.confidence_score}%
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">分析摘要</h4>
                <p className="text-gray-700 text-sm leading-relaxed">
                  {result.analysis_summary}
                </p>
              </div>

              {result.key_findings && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">关键发现</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    {result.key_findings.map((finding, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-primary-600 mr-2">•</span>
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="text-sm text-gray-500">
                分析时间: {new Date(result.created_at).toLocaleString('zh-CN')}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">等待分析结果</p>
              <p className="text-sm text-gray-500 mt-1">提交股票代码开始分析</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analyze;