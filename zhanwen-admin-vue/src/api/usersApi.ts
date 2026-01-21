import request from '@/utils/http'

export class UserService {
  // 登录
  static login(params: Api.Auth.LoginParams) {
    // 兼容前端表单字段：userName | username | email
    const payload: any = {
      password: (params as any).password,
      remember: (params as any).remember ?? false
    }
    if ((params as any).userName) payload.username = (params as any).userName
    else if ((params as any).username) payload.username = (params as any).username
    else if ((params as any).email) payload.email = (params as any).email

    console.log('🔐 发起登录请求:', {
      url: '/auth/login',
      payload,
      timestamp: new Date().toISOString()
    })

    return request.post<Api.Auth.LoginResponse>({
      // 注意：后端 auth 路由挂载在根路径 '/auth'，不在 '/api' 下
      // 显式使用空 baseURL，避免全局 baseURL='/api' 时拼接为 '/api/auth/login'
      baseURL: '',
      url: '/auth/login',
      data: payload
      // showErrorMessage: false // 不显示错误消息
    })
  }

  // 获取用户信息
  static getUserInfo() {
    return request.get<Api.User.UserInfo>({
      baseURL: '',
      url: '/auth/me'
    })
  }

  // 修改密码
  static changePassword(data: {
    currentPassword: string
    newPassword: string
    confirmPassword: string
  }) {
    return request.put({
      baseURL: '',
      url: '/auth/change-password',
      data
    })
  }

  // 获取用户列表
  static getUserList(params: Api.Common.PaginatingSearchParams) {
    return request.get<Api.User.UserListData>({
      url: '/user/list',
      params
    })
  }
}
