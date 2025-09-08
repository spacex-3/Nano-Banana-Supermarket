import React, { useState, useEffect } from 'react';
import './AdminPanel.css';

interface AdminUser {
  phone: string;
  password: string;
  remainingUses: number;
  imagesGenerated: number;
  createdAt: string;
  lastLoginAt: string | null;
}

interface AdminStats {
  totalUsers: number;
  totalImages: number;
}

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<AdminStats>({ totalUsers: 0, totalImages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetPhone, setResetPhone] = useState('');
  const [resetUses, setResetUses] = useState(10);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        headers: {
          'admin-token': 'admin-secret-token'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setStats(data.stats);
      } else {
        setError('获取用户数据失败');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  const handleResetUses = async (phone: string, newUses: number) => {
    try {
      const response = await fetch('/api/admin/reset-uses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'admin-token': 'admin-secret-token'
        },
        body: JSON.stringify({ phone, newUses })
      });

      const result = await response.json();

      if (response.ok) {
        alert(`用户 ${phone} 的使用次数已重置为 ${newUses}`);
        fetchUsers(); // 刷新用户列表
      } else {
        alert(`重置失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Error resetting uses:', error);
      alert('网络错误');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '从未登录';
    return new Date(dateString).toLocaleString('zh-CN');
  };

  if (loading) {
    return (
      <div className="admin-overlay">
        <div className="admin-panel">
          <div className="admin-loading">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        <div className="admin-header">
          <h2>管理员面板</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {error && <div className="admin-error">{error}</div>}

        <div className="admin-stats">
          <div className="stat-card">
            <h3>总用户数</h3>
            <div className="stat-number">{stats.totalUsers}</div>
          </div>
          <div className="stat-card">
            <h3>总生成图片</h3>
            <div className="stat-number">{stats.totalImages}</div>
          </div>
        </div>

        <div className="admin-actions">
          <h3>快速操作</h3>
          <div className="reset-form">
            <input
              type="tel"
              placeholder="手机号"
              value={resetPhone}
              onChange={(e) => setResetPhone(e.target.value)}
            />
            <input
              type="number"
              placeholder="新次数"
              value={resetUses}
              onChange={(e) => setResetUses(Number(e.target.value))}
              min="0"
            />
            <button
              onClick={() => {
                if (resetPhone) {
                  handleResetUses(resetPhone, resetUses);
                  setResetPhone('');
                  setResetUses(10);
                }
              }}
              disabled={!resetPhone}
            >
              重置次数
            </button>
          </div>
        </div>

        <div className="users-table-container">
          <h3>用户列表 ({users.length})</h3>
          <div className="users-table">
            <div className="table-header">
              <div>手机号</div>
              <div>密码</div>
              <div>剩余次数</div>
              <div>已生成</div>
              <div>注册时间</div>
              <div>最后登录</div>
              <div>操作</div>
            </div>
            {users.map((user) => (
              <div key={user.phone} className="table-row">
                <div className="phone">{user.phone}</div>
                <div className="password">{user.password}</div>
                <div className={`uses ${user.remainingUses <= 3 ? 'low' : ''}`}>
                  {user.remainingUses}
                </div>
                <div className="generated">{user.imagesGenerated}</div>
                <div className="date">{formatDate(user.createdAt)}</div>
                <div className="date">{formatDate(user.lastLoginAt)}</div>
                <div className="actions">
                  <button
                    className="reset-btn"
                    onClick={() => handleResetUses(user.phone, 10)}
                  >
                    重置10次
                  </button>
                  <button
                    className="reset-btn secondary"
                    onClick={() => handleResetUses(user.phone, 50)}
                  >
                    重置50次
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {users.length === 0 && !loading && (
          <div className="no-users">暂无用户数据</div>
        )}
      </div>
    </div>
  );
}