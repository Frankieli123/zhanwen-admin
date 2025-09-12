import { router } from '@/router'
import { App, Directive, DirectiveBinding } from 'vue'
import { useUserStore } from '@/store/modules/user'

/**
 * 权限指令（后端控制模式可用）
 * 用法：
 * <el-button v-auth="'add'">按钮</el-button>
 */

interface AuthBinding extends DirectiveBinding {
  value: string
}

function checkAuthPermission(el: HTMLElement, binding: AuthBinding): void {
  // 管理员角色直接放行（与后端保持一致：admin / super_admin 及 R_ADMIN / R_SUPER）
  const roles = useUserStore().getUserInfo.roles || []
  const privileged =
    Array.isArray(roles) &&
    (roles.includes('super_admin') ||
      roles.includes('admin') ||
      roles.includes('R_SUPER') ||
      roles.includes('R_ADMIN'))
  if (privileged) return

  // 获取当前路由的权限列表
  const authList = (router.currentRoute.value.meta.authList as Array<{ authMark: string }>) || []

  // 检查是否有对应的权限标识
  const hasPermission = authList.some((item) => item.authMark === binding.value)

  // 如果没有权限，移除元素
  if (!hasPermission) {
    removeElement(el)
  }
}

function removeElement(el: HTMLElement): void {
  if (el.parentNode) {
    el.parentNode.removeChild(el)
  }
}

const authDirective: Directive = {
  mounted: checkAuthPermission,
  updated: checkAuthPermission
}

export function setupAuthDirective(app: App): void {
  app.directive('auth', authDirective)
}
