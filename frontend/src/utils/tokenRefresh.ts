import { TokenManager, authAPI } from './api';

/**
 * Token 自动刷新管理器
 * 在后台自动检查和刷新即将过期的 token
 */
class TokenRefreshManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  /**
   * 启动自动刷新检查
   * 每5分钟检查一次 token 状态
   */
  start() {
    this.stop(); // 先停止之前的定时器
    
    this.refreshTimer = setInterval(() => {
      this.checkAndRefreshToken();
    }, 5 * 60 * 1000); // 5分钟检查一次

    // 立即检查一次
    this.checkAndRefreshToken();
  }

  /**
   * 停止自动刷新检查
   */
  stop() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * 检查并刷新 token
   */
  private async checkAndRefreshToken() {
    // 如果正在刷新，跳过
    if (this.isRefreshing) {
      return;
    }

    // 检查是否有 token
    const currentToken = TokenManager.getToken();
    if (!currentToken) {
      return;
    }

    // 检查是否即将过期（30分钟内）
    if (TokenManager.willExpireSoon()) {
      console.log('🔄 Token 即将过期，开始自动刷新...');
      await this.refreshToken();
    }
  }

  /**
   * 刷新 token
   */
  private async refreshToken() {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;

    try {
      const response = await authAPI.refreshToken();
      
      if (response.success && response.data) {
        const { token, expiresIn } = response.data;
        TokenManager.setToken(token, expiresIn || '7d');
        console.log('✅ Token 自动刷新成功');
      } else {
        console.warn('⚠️ Token 刷新失败，响应无效');
        this.handleRefreshFailure();
      }
    } catch (error) {
      console.warn('⚠️ Token 自动刷新失败:', error);
      this.handleRefreshFailure();
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * 处理刷新失败
   */
  private handleRefreshFailure() {
    // 清除 token
    TokenManager.clearToken();
    
    // 停止自动刷新
    this.stop();
    
    // 跳转到登录页
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  /**
   * 手动刷新 token
   */
  async manualRefresh(): Promise<boolean> {
    try {
      await this.refreshToken();
      return true;
    } catch (error) {
      console.error('手动刷新 token 失败:', error);
      return false;
    }
  }

  /**
   * 获取 token 状态信息
   */
  getTokenStatus() {
    const token = TokenManager.getToken();
    const timeToExpiry = TokenManager.getTimeToExpiry();
    const willExpireSoon = TokenManager.willExpireSoon();

    return {
      hasToken: !!token,
      timeToExpiry,
      willExpireSoon,
      isRefreshing: this.isRefreshing,
      formattedTimeToExpiry: this.formatTime(timeToExpiry)
    };
  }

  /**
   * 格式化时间显示
   */
  private formatTime(milliseconds: number): string {
    if (milliseconds <= 0) return '已过期';

    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  }
}

// 创建全局实例
export const tokenRefreshManager = new TokenRefreshManager();

// 在应用启动时自动开始
if (typeof window !== 'undefined') {
  // 页面加载完成后启动
  window.addEventListener('load', () => {
    tokenRefreshManager.start();
  });

  // 页面卸载时停止
  window.addEventListener('beforeunload', () => {
    tokenRefreshManager.stop();
  });
}
