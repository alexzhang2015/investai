import React from 'react';
import { NavLink } from 'react-router-dom';
import { BarChart3, History, User, Home, Briefcase, TrendingUp, Calendar } from 'lucide-react';

const Navigation: React.FC = () => {
  const navItems = [
    { path: '/', label: '首页', icon: Home },
    { path: '/analyze', label: '股票分析', icon: BarChart3 },
    { path: '/portfolio', label: '投资组合', icon: Briefcase },
    { path: '/trading', label: '股票交易', icon: TrendingUp },
    { path: '/trade-history', label: '交易历史', icon: Calendar },
    { path: '/history', label: '分析历史', icon: History },
    { path: '/profile', label: '个人资料', icon: User },
  ];

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-8">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-1 px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navigation;