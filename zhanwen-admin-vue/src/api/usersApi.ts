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
      url: '/api/auth/login',
      payload,
      timestamp: new Date().toISOString()
    })

    return request.post<Api.Auth.LoginResponse>({
      url: '/api/auth/login',
      data: payload
      // showErrorMessage: false // 不显示错误消息
    })
  }

  // 获取用户信息
  static getUserInfo() {
    return request.get<Api.User.UserInfo>({
      url: '/api/auth/me'
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
