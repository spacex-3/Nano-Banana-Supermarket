import React from 'react';
import './UserInfo.css';

interface User {
  phone: string;
  username?: string;
  remainingUses: number;
  imagesGenerated: number;
}

interface UserInfoProps {
  user: User;
  onLogout: () => void;
}

export default function UserInfo({ user, onLogout }: UserInfoProps) {
  const handleLogout = () => {
    localStorage.removeItem('user');
    onLogout();
  };

  return (
    <div className="user-info">
      <div className="user-details">
        <div className="user-phone">
          <span className="label">用户：</span>
          <span className="value">{user.username || user.phone}</span>
        </div>
        <div className="user-stats">
          <div className="stat">
            <span className="stat-label">剩余次数</span>
            <span className={`stat-value ${user.remainingUses <= 3 ? 'warning' : ''}`}>
              {user.remainingUses}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">已生成</span>
            <span className="stat-value">{user.imagesGenerated}</span>
          </div>
        </div>
      </div>
      <button className="logout-button" onClick={handleLogout}>
        退出登录
      </button>
    </div>
  );
}