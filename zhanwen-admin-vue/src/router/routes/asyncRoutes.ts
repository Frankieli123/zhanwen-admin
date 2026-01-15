import { RoutesAlias } from '../routesAlias'
import { AppRouteRecord } from '@/types/router'

export const asyncRoutes: AppRouteRecord[] = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    component: RoutesAlias.Layout,
    meta: {
      title: 'menus.dashboard.title',
      icon: '&#xe721;',
      roles: ['R_SUPER', 'R_ADMIN']
    },
    children: [
      {
        path: 'console',
        name: 'Console',
        component: RoutesAlias.Dashboard,
        meta: {
          title: 'menus.dashboard.console',
          keepAlive: false,
          fixedTab: true
        }
      }
    ]
  },
  {
    path: '/statistics',
    name: 'Statistics',
    component: RoutesAlias.Layout,
    meta: {
      title: 'menus.statistics.title',
      icon: '&#xe742;'
    },
    children: [
      {
        path: 'usage',
        name: 'UsageStatistics',
        component: () => import('@/views/statistics/index.vue'),
        meta: {
          title: 'menus.statistics.usage',
          keepAlive: true
        }
      },
      {
        path: 'endpoints',
        name: 'EndpointStatistics',
        component: () => import('@/views/statistics/endpoints/index.vue'),
        meta: {
          title: 'menus.statistics.endpoints',
          keepAlive: true
        }
      },
      {
        path: 'errors',
        name: 'ErrorStatistics',
        component: () => import('@/views/statistics/errors/index.vue'),
        meta: {
          title: 'menus.statistics.errors',
          keepAlive: true
        }
      },
      {
        path: 'performance',
        name: 'PerformanceStatistics',
        component: () => import('@/views/statistics/performance/index.vue'),
        meta: {
          title: 'menus.statistics.performance',
          keepAlive: true
        }
      },
      {
        path: 'geo',
        name: 'GeoStatistics',
        component: () => import('@/views/statistics/geo/index.vue'),
        meta: {
          title: 'menus.statistics.geo',
          keepAlive: true
        }
      },
      {
        path: 'devices',
        name: 'DeviceStatistics',
        component: () => import('@/views/statistics/devices/index.vue'),
        meta: {
          title: 'menus.statistics.devices',
          keepAlive: true
        }
      },
      {
        path: 'client-metrics',
        name: 'ClientMetrics',
        component: () => import('@/views/statistics/client-metrics/index.vue'),
        meta: {
          title: 'menus.statistics.clientMetrics',
          keepAlive: true
        }
      },
      {
        path: 'clients',
        name: 'ClientDetails',
        component: () => import('@/views/statistics/clients/index.vue'),
        meta: {
          title: 'menus.statistics.clients',
          keepAlive: true
        }
      },
      {
        path: 'models',
        name: 'ModelStatistics',
        component: () => import('@/views/statistics/models/index.vue'),
        meta: {
          title: 'menus.statistics.models',
          keepAlive: true
        }
      }
    ]
  },
  {
    path: '/ai-models',
    name: 'AIModels',
    component: RoutesAlias.Layout,
    meta: {
      title: '模型服务',
      icon: '&#xe819;'
    },
    children: [
      {
        path: 'providers',
        name: 'AIProviders',
        component: () => import('@/views/ai-models/providers/index.vue'),
        meta: {
          title: '服务商管理',
          keepAlive: true
        }
      },
      {
        path: 'list',
        name: 'AIModelsList',
        component: () => import('@/views/ai-models/index.vue'),
        meta: {
          title: '模型列表',
          keepAlive: true
        }
      }
    ]
  },
  {
    path: '/prompts',
    name: 'Prompts',
    component: RoutesAlias.Layout,
    meta: {
      title: '提示词管理',
      icon: '&#xe71d;'
    },
    children: [
      {
        path: 'list',
        name: 'PromptsList',
        component: () => import('@/views/prompts/index.vue'),
        meta: {
          title: '提示词列表',
          keepAlive: true
        }
      }
    ]
  },
  {
    path: '/api-keys',
    name: 'ApiKeys',
    component: RoutesAlias.Layout,
    meta: {
      title: '密钥管理',
      icon: '&#xe73c;'
    },
    children: [
      {
        path: 'list',
        name: 'ApiKeysList',
        component: () => import('@/views/api-keys/index.vue'),
        meta: {
          title: '密钥列表',
          keepAlive: true,
          authList: [
            { title: '更新', authMark: 'api_keys:update' },
            { title: '新增', authMark: 'api_keys:create' },
            { title: '删除', authMark: 'api_keys:delete' }
          ]
        }
      }
    ]
  }
]
