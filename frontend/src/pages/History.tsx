import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, Download } from 'lucide-react';
import { analysisAPI } from '../services/api';
import { InvestmentRecommendation } from '../types';

const History: React.FC = () => {
  const [analyses, setAnalyses] = useState<InvestmentRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<InvestmentRecommendation | null>(null);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const data = await analysisAPI.getHistory();
      setAnalyses(data);
    } catch (error) {
      console.error('Failed to load analyses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation.toLowerCase()) {
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

  const exportToCSV = () => {
    const headers = ['股票代码', '股票名称', '推荐', '信心指数', '分析时间', '分析摘要'];
    const csvData = analyses.map(analysis => [
      analysis.symbol,
      analysis.stock_name,
      analysis.recommendation,
      analysis.confidence_score + '%',
      new Date(analysis.created_at).toLocaleString('zh-CN'),
      analysis.analysis_summary.replace(/,/g, ';')
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'investai-analysis-history.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">加载分析历史...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">分析历史</h1>
          <p className="text-gray-600">查看您的股票分析记录</p>
        </div>
        
        {analyses.length > 0 && (
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 btn-secondary"
          >
            <Download className="h-4 w-4" />
            <span>导出CSV</span>
          </button>
        )}
      </div>

      {analyses.length === 0 ? (
        <div className="bg-white rounded-lg shadow text-center py-16">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无分析记录</h3>
          <p className="text-gray-600">开始您的第一次股票分析吧！</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              共 {analyses.length} 条分析记录
            </h2>
          </div>
          
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analyses.map((analysis) => (
                  <tr key={analysis.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {analysis.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {analysis.stock_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRecommendationColor(analysis.recommendation)}`}>
                        {analysis.recommendation}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {analysis.confidence_score}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(analysis.created_at).toLocaleDateString('zh-CN')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedAnalysis(analysis)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        查看详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedAnalysis && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">分析详情</h3>
              <button
                onClick={() => setSelectedAnalysis(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">{selectedAnalysis.stock_name}</h4>
                  <p className="text-gray-600">{selectedAnalysis.symbol}</p>
                </div>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getRecommendationColor(selectedAnalysis.recommendation)}`}>
                  {selectedAnalysis.recommendation}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">信心指数</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedAnalysis.confidence_score}%</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">分析时间</p>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedAnalysis.created_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">分析摘要</p>
                <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded">
                  {selectedAnalysis.analysis_summary}
                </p>
              </div>

              {selectedAnalysis.key_findings && selectedAnalysis.key_findings.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">关键发现</p>
                  <ul className="text-sm text-gray-700 space-y-1 bg-gray-50 p-3 rounded">
                    {selectedAnalysis.key_findings.map((finding, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-primary-600 mr-2">•</span>
                        {finding}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAnalysis.risk_assessment && (
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">风险评估</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedAnalysis.risk_assessment}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;