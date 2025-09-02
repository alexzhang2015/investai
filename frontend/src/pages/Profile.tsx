import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Save, Key, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

const profileSchema = z.object({
  full_name: z.string().min(1, '姓名不能为空').max(50, '姓名最多50位'),
  email: z.string().email('请输入有效的邮箱地址'),
});

const passwordSchema = z.object({
  current_password: z.string().min(6, '当前密码至少6位'),
  new_password: z.string().min(6, '新密码至少6位'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: '密码不匹配',
  path: ['confirm_password'],
});

type ProfileFormData = z.infer<typeof profileSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [profileMessage, setProfileMessage] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      email: user?.email || '',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormData) => {
    setIsLoading(true);
    setProfileMessage('');

    try {
      await authAPI.updateProfile(data);
      setProfileMessage('个人信息更新成功');
    } catch (error: any) {
      setProfileMessage(error.response?.data?.detail || '更新失败');
    } finally {
      setIsLoading(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setIsLoading(true);
    setPasswordMessage('');

    try {
      await authAPI.changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      });
      setPasswordMessage('密码修改成功');
      passwordForm.reset();
    } catch (error: any) {
      setPasswordMessage(error.response?.data?.detail || '密码修改失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">个人资料</h1>
        <p className="text-gray-600">管理您的账户信息和设置</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('profile')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'profile'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>个人信息</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === 'password'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Key className="h-4 w-4" />
                <span>修改密码</span>
              </div>
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'profile' ? (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-6">个人信息</h2>
              
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                {profileMessage && (
                  <div className={`px-4 py-3 rounded-lg text-sm ${
                    profileMessage.includes('成功')
                      ? 'bg-green-50 border border-green-200 text-green-600'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}>
                    {profileMessage}
                  </div>
                )}

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    用户名
                  </label>
                  <input
                    type="text"
                    value={user?.username || ''}
                    disabled
                    className="input-field bg-gray-50"
                  />
                  <p className="mt-1 text-sm text-gray-500">用户名创建后不可修改</p>
                </div>

                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-2">
                    姓名
                  </label>
                  <input
                    {...profileForm.register('full_name')}
                    type="text"
                    className="input-field"
                    placeholder="请输入您的真实姓名"
                  />
                  {profileForm.formState.errors.full_name && (
                    <p className="mt-1 text-sm text-red-600">
                      {profileForm.formState.errors.full_name.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    邮箱地址
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      {...profileForm.register('email')}
                      type="email"
                      className="input-field pl-10"
                      placeholder="请输入邮箱地址"
                    />
                  </div>
                  {profileForm.formState.errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {profileForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? '保存中...' : '保存更改'}
                </button>
              </form>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-6">修改密码</h2>
              
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                {passwordMessage && (
                  <div className={`px-4 py-3 rounded-lg text-sm ${
                    passwordMessage.includes('成功')
                      ? 'bg-green-50 border border-green-200 text-green-600'
                      : 'bg-red-50 border border-red-200 text-red-600'
                  }`}>
                    {passwordMessage}
                  </div>
                )}

                <div>
                  <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 mb-2">
                    当前密码
                  </label>
                  <input
                    {...passwordForm.register('current_password')}
                    type="password"
                    className="input-field"
                    placeholder="请输入当前密码"
                  />
                  {passwordForm.formState.errors.current_password && (
                    <p className="mt-1 text-sm text-red-600">
                      {passwordForm.formState.errors.current_password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-2">
                    新密码
                  </label>
                  <input
                    {...passwordForm.register('new_password')}
                    type="password"
                    className="input-field"
                    placeholder="请输入新密码"
                  />
                  {passwordForm.formState.errors.new_password && (
                    <p className="mt-1 text-sm text-red-600">
                      {passwordForm.formState.errors.new_password.message}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-2">
                    确认新密码
                  </label>
                  <input
                    {...passwordForm.register('confirm_password')}
                    type="password"
                    className="input-field"
                    placeholder="请再次输入新密码"
                  />
                  {passwordForm.formState.errors.confirm_password && (
                    <p className="mt-1 text-sm text-red-600">
                      {passwordForm.formState.errors.confirm_password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Key className="h-4 w-4 mr-2" />
                  {isLoading ? '修改中...' : '修改密码'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">账户信息</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600">用户ID</p>
            <p className="text-sm font-medium text-gray-900">{user?.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">注册时间</p>
            <p className="text-sm font-medium text-gray-900">
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : '未知'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">最后登录</p>
            <p className="text-sm font-medium text-gray-900">
              {user?.last_login ? new Date(user.last_login).toLocaleString('zh-CN') : '从未登录'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">账户状态</p>
            <p className="text-sm font-medium text-green-600">正常</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;