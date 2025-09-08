import React, { useState } from 'react';
import './AdminLogin.css';

interface AdminLoginProps {
  onAdminLoginSuccess: () => void;
  onClose: () => void;
}

export default function AdminLogin({ onAdminLoginSuccess, onClose }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('用户名和密码不能为空');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // 保存管理员登录状态
        localStorage.setItem('adminLoggedIn', 'true');
        onAdminLoginSuccess();
      } else {
        setError(result.error || '登录失败');
      }
    } catch (error) {
      console.error('Admin login error:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-overlay">
      <div className="admin-login-container">
        <div className="admin-login-header">
          <h2>🔒 管理员登录</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="form-group">
            <label htmlFor="admin-username">用户名</label>
            <input
              id="admin-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入管理员用户名"
            />
          </div>

          <div className="form-group">
            <label htmlFor="admin-password">密码</label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入管理员密码"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="admin-login-button" disabled={loading}>
            {loading ? '验证中...' : '登录管理面板'}
          </button>
        </form>

        <div className="admin-login-info">
          <p>⚠️ 仅限系统管理员使用</p>
        </div>
      </div>
    </div>
  );
}