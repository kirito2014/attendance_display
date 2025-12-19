'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import '@fortawesome/fontawesome-free/css/all.min.css';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // 检查是否已经登录
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const response = await fetch('/api/admin/config', {
          method: 'GET',
          credentials: 'include'
        });
        
        if (response.ok) {
          router.push('/admin/dashboard');
        }
      } catch (err) {
        // 忽略错误，保持在登录页面
      }
    };
    
    checkLogin();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        router.push('/admin/dashboard');
      } else {
        setError(data.message || '登录失败，请检查用户名和密码');
      }
    } catch (err) {
      setError('服务器错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 border border-slate-100">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="bg-indigo-100 text-indigo-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-user-shield text-2xl"></i>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">管理员登录</h1>
          <p className="text-slate-500 mt-2">请输入管理员账号和密码</p>
        </div>

        {/* 登录表单 */}
        <form onSubmit={handleSubmit}>
          {/* 用户名输入框 */}
          <div className="mb-5">
            <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
              用户名
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-user text-slate-400"></i>
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="请输入用户名"
              />
            </div>
          </div>

          {/* 密码输入框 */}
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              密码
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i className="fas fa-lock text-slate-400"></i>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                placeholder="请输入密码"
              />
            </div>
          </div>

          {/* 错误信息 */}
          {error && (
            <div className="mb-5 bg-red-50 text-red-600 px-4 py-3 rounded-xl flex items-center">
              <i className="fas fa-exclamation-circle mr-2"></i>
              <span>{error}</span>
            </div>
          )}

          {/* 登录按钮 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center disabled:bg-indigo-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                <span>登录中...</span>
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt mr-2"></i>
                <span>登录</span>
              </>
            )}
          </button>
        </form>

        {/* 页脚 */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>© 2025 XXX公司考勤信息屏管理系统</p>
        </div>
      </div>
    </div>
  );
}
