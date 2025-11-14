<template>
  <div class="art-page-view">
    <!-- 搜索区域 -->
    <ArtSearchBar
      ref="searchBarRef"
      v-model="searchFormModel"
      :items="searchItems"
      :is-expand="false"
      :show-expand="true"
      :show-reset="true"
      :show-search="true"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 表格区域 -->
    <ElCard class="art-table-card" shadow="never">
      <template #header>
        <div class="table-header-wrapper">
          <h4>API 密钥管理</h4>
          <div class="table-info">
            <ElTag v-if="loading" type="warning">加载中...</ElTag>
            <ElTag v-else type="success">{{ tableData.length }} 条</ElTag>
          </div>
        </div>
      </template>

      <!-- 表格工具栏 -->
      <ArtTableHeader
        v-model:columns="columnChecks"
        @refresh="handleRefresh"
        layout="refresh,size,fullscreen,columns,settings"
        fullClass="art-table-card"
      >
        <template #left>
          <ElButton v-auth="'api_keys:create'" type="primary" @click="handleAdd">
            <ElIcon><Plus /></ElIcon>
            新增密钥
          </ElButton>
          <ElButton
            v-auth="'api_keys:delete'"
            @click="handleBatchDelete"
            :disabled="selectedRows.length === 0"
          >
            <ElIcon><Delete /></ElIcon>
            批量删除 ({{ selectedRows.length }})
          </ElButton>
        </template>
      </ArtTableHeader>

      <!-- 表格主体 -->
      <ArtTable
        ref="tableRef"
        :loading="loading"
        :pagination="pagination"
        :data="tableData"
        :columns="columns"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <!-- 状态列：与模型列表一致，使用开关切换 -->
        <template #isActive="{ row }">
          <ElSwitch
            v-model="row.isActive"
            :loading="row.switching"
            @change="(val) => handleToggleStatus(row, Boolean(val))"
          />
        </template>

        <!-- API KEY 列 -->
        <template #key="{ row }">
          <div class="key-cell-wrap">
            <span class="key-cell mono">{{ maskKey(row.key) }}</span>
            <ElTooltip content="复制密钥" placement="top">
              <i class="iconfont-sys iconsys-copy key-copy" @click="handleCopyKey(row)"></i>
            </ElTooltip>
          </div>
        </template>

        <!-- 权限列 -->
        <template #permissions="{ row }">
          <div class="perm-tags">
            <ElTag
              v-for="p in row.permissions || []"
              :key="p"
              size="small"
              type="info"
              effect="plain"
            >
              {{ renderPermission(p) }}
            </ElTag>
            <span v-if="!row.permissions || row.permissions.length === 0" class="text-muted">
              -
            </span>
          </div>
        </template>

        <!-- 最后使用时间列 -->
        <template #lastUsedAt="{ row }">
          {{ formatDate(row.lastUsedAt) }}
        </template>

        <!-- 过期时间列 -->
        <template #expiresAt="{ row }">
          {{ formatDate(row.expiresAt) }}
        </template>

        <!-- 创建时间列 -->
        <template #createdAt="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>

        <!-- 操作列 -->
        <template #operation="{ row }">
          <div class="op-btns">
            <ElTooltip v-auth="'api_keys:update'" content="刷新密钥" placement="top">
              <ElButton
                class="op-btn op-refresh"
                :class="{ 'is-disabled': row.refreshing }"
                @click="handleRefreshKey(row)"
                :disabled="row.refreshing"
              >
                <span v-if="row.refreshing" class="spinner-dash" />
                <i v-else class="iconfont-sys iconsys-shuaxin1" />
              </ElButton>
            </ElTooltip>
            <ElTooltip v-auth="'api_keys:update'" content="重置密钥" placement="top">
              <ElButton
                class="op-btn op-reset"
                :class="{ 'is-disabled': row.refreshing }"
                @click="handleResetKey(row)"
                :disabled="row.refreshing"
              >
                <span v-if="row.refreshing" class="spinner-dash" />
                <i v-else class="iconfont-sys iconsys-redo-circle" />
              </ElButton>
            </ElTooltip>
            <ElTooltip v-auth="'api_keys:update'" content="编辑" placement="top">
              <ElButton class="op-btn op-edit" @click="handleEdit(row)">
                <i class="iconfont-sys iconsys-bianji2" />
              </ElButton>
            </ElTooltip>
            <ElTooltip v-auth="'api_keys:delete'" content="删除" placement="top">
              <ElButton class="op-btn op-delete" @click="handleDelete(row)">
                <i class="iconfont-sys iconsys-lajitong" />
              </ElButton>
            </ElTooltip>
          </div>
        </template>
      </ArtTable>
    </ElCard>

    <!-- 新增/编辑对话框 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="620px"
      :close-on-click-modal="false"
      :align-center="true"
    >
      <ElForm ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <ElFormItem label="名称" prop="name">
          <ElInput v-model="formData.name" placeholder="请输入密钥名称" />
        </ElFormItem>
        <ElFormItem label="权限" prop="permissions">
          <ElSelect
            v-model="formData.permissions"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="选择或新建权限标识（回车新增）"
            style="width: 100%"
          >
            <ElOption
              v-for="p in permissionOptions"
              :key="p"
              :label="renderPermission(p)"
              :value="p"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="启用状态" prop="isActive">
          <ElSwitch v-auth="'api_keys:update'" v-model="formData.isActive" />
        </ElFormItem>
        <ElFormItem label="每日限额" prop="dailyLimit">
          <ElInputNumber v-model="formData.dailyLimit" :min="0" :step="1" placeholder="可选" />
        </ElFormItem>
        <ElFormItem label="总限额" prop="totalLimit">
          <ElInputNumber v-model="formData.totalLimit" :min="0" :step="1" placeholder="可选" />
        </ElFormItem>
        <ElFormItem label="过期时间" prop="expiresAt">
          <ElDatePicker
            v-model="formData.expiresAt"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            format="YYYY-MM-DD HH:mm:ss"
            placeholder="可选"
            style="width: 100%"
          />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted, watch } from 'vue'
  import { ElMessage, ElMessageBox } from 'element-plus'
  import {
    ElCard,
    ElTag,
    ElButton,
    ElIcon,
    ElSwitch,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElSelect,
    ElOption,
    ElTooltip,
    ElDatePicker,
    ElInputNumber
  } from 'element-plus'
  import { Plus, Delete } from '@element-plus/icons-vue'
  import type { FormRules } from 'element-plus'
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import ArtTableHeader from '@/components/core/tables/art-table-header/index.vue'
  import ArtSearchBar from '@/components/core/forms/art-search-bar/index.vue'
  import { useTableColumns, getColumnKey } from '@/composables/useTableColumns'
  import { useAuth } from '@/composables/useAuth'
  import { copy as copyText } from '@/utils/browser/bom'
  import {
    getApiKeys,
    createApiKey,
    updateApiKey,
    deleteApiKey,
    refreshApiKey,
    resetApiKey,
    getPermissions,
    type ApiKey,
    type PermissionsResponse
  } from '@/api/api-keys'

  defineOptions({ name: 'ApiKeysList' })

  // 引用
  const tableRef = ref()
  const searchBarRef = ref()
  const formRef = ref()

  // 状态
  const loading = ref(false)
  const tableData = ref<ApiKey[]>([])
  const selectedRows = ref<ApiKey[]>([])
  const pagination = reactive({ current: 1, size: 10, total: 0 })

  // 权限：是否可更新（控制按钮禁用）
  const { hasAuth } = useAuth()
  const canUpdate = computed(() => hasAuth('api_keys:update'))

  // 后端权限枚举（用于表单选择与 v-auth 显隐对齐）
  const builtinPermissions = [
    'api_keys:read',
    'api_keys:create',
    'api_keys:update',
    'api_keys:delete'
  ]

  // 动态权限选项，默认用内置权限占位，加载后端后覆盖
  const permissionOptions = ref<string[]>([...builtinPermissions])

  const loadPermissions = async () => {
    try {
      const res = (await getPermissions()) as PermissionsResponse
      const all = Array.isArray(res?.all) ? res.all : []
      permissionOptions.value = all.length ? all : [...builtinPermissions]
    } catch {
      // 回退到内置权限，避免选择为空
      permissionOptions.value = [...builtinPermissions]
    }
  }

  // 权限中文说明映射
  const permZhMap: Record<string, string> = {
    'configs:read': '配置读取',
    'configs:create': '配置创建',
    'configs:update': '配置更新',
    'configs:delete': '配置删除',
    'api_keys:read': 'API密钥读取',
    'api_keys:create': 'API密钥创建',
    'api_keys:update': 'API密钥更新',
    'api_keys:delete': 'API密钥删除',
    'ai_models:read': '模型读取',
    'ai_models:create': '模型创建',
    'ai_models:update': '模型更新',
    'ai_models:delete': '模型删除',
    'prompts:read': '提示词读取',
    'prompts:create': '提示词创建',
    'prompts:update': '提示词更新',
    'prompts:delete': '提示词删除',
    'analytics:read': '分析查看',
    'clients:read': '客户端读取',
    'clients:write': '客户端写入',
    'usage:write': '使用数据上报',
    'hexagrams:read': '卦象读取',
    'hexagrams:create': '卦象创建',
    'hexagrams:update': '卦象更新',
    'hexagrams:delete': '卦象删除',
    'divination:analyze': '解卦分析'
  }

  // 模块与动作的中文映射（用于未显式配置的权限，通用回退）
  const moduleZhMap: Record<string, string> = {
    configs: '配置',
    api_keys: 'API密钥',
    ai_models: '模型',
    prompts: '提示词',
    analytics: '分析',
    clients: '客户端',
    hexagrams: '卦象',
    divination: '解卦',
    users: '用户',
    roles: '角色',
    permissions: '权限',
    logs: '日志',
    settings: '设置'
  }

  const actionZhMap: Record<string, string> = {
    read: '读取',
    list: '列表',
    create: '创建',
    update: '更新',
    delete: '删除',
    write: '写入',
    regenerate: '重新生成',
    export: '导出',
    import: '导入',
    manage: '管理',
    analyze: '分析'
  }

  const renderPermission = (p: string) => {
    const zh = permZhMap[p]
    if (zh) return `${zh}(${p})`
    const [mod, act] = String(p).split(':')
    if (mod) {
      const modZh = moduleZhMap[mod] || mod
      const actZh = act ? actionZhMap[act] || act : ''
      return `${modZh}${actZh ? ' - ' + actZh : ''}(${p})`
    }
    return p
  }

  // 搜索表单
  const searchFormState = reactive<Record<string, any>>({
    name: '',
    isActive: undefined
  })

  // v-model 包装器，避免对 const reactive 对象整体赋值
  const searchFormModel = computed<Record<string, any>>({
    get: () => searchFormState,
    set: (v) => Object.assign(searchFormState, v || {})
  })

  // 搜索配置
  const searchItems = computed(() => [
    {
      key: 'name',
      label: '名称',
      type: 'input',
      props: { placeholder: '请输入名称', clearable: true }
    },
    {
      key: 'isActive',
      label: '状态',
      type: 'select',
      props: {
        placeholder: '请选择状态',
        clearable: true,
        options: [
          { label: '全部', value: undefined },
          { label: '启用', value: true },
          { label: '禁用', value: false }
        ]
      }
    }
  ])

  // 表格列配置与列勾选（与 ArtTableHeader 联动）
  const { columns, columnChecks } = useTableColumns<ApiKey>(() => [
    { type: 'selection', width: 55 },
    { prop: 'name', label: '名称', minWidth: 160 },
    { prop: 'isActive', label: '状态', width: 90, useSlot: true },
    { prop: 'key', label: 'API KEY', minWidth: 240, useSlot: true },
    { prop: 'permissions', label: '权限', minWidth: 260, useSlot: true },
    { prop: 'usageCount', label: '使用次数', width: 100 },
    { prop: 'lastUsedAt', label: '最后使用时间', minWidth: 160, useSlot: true },
    { prop: 'expiresAt', label: '过期时间', minWidth: 160, useSlot: true },
    { prop: 'createdAt', label: '创建时间', minWidth: 160, useSlot: true },
    { prop: 'operation', label: '操作', width: 200, fixed: 'right', useSlot: true }
  ])

  // 列显示持久化 Key
  const COLS_STORAGE_KEY = 'art:columns:api-keys'

  // 列显示持久化：保存（包含顺序与勾选状态）
  watch(
    columnChecks,
    (val) => {
      try {
        const payload = val.map((c: any) => ({ prop: getColumnKey(c), checked: !!c.checked }))
        localStorage.setItem(COLS_STORAGE_KEY, JSON.stringify(payload))
      } catch (e) {
        console.warn('列配置保存失败', e)
      }
    },
    { deep: true }
  )

  // 加载数据
  const loadData = async (params?: Record<string, any>) => {
    loading.value = true
    try {
      const query: Record<string, any> = {
        page: pagination.current,
        pageSize: pagination.size,
        ...searchFormState,
        ...params
      }
      Object.keys(query).forEach((k) => {
        if (query[k] === '' || query[k] === undefined) delete query[k]
      })
      const res: any = await getApiKeys(query)
      const list = (res && (res.list || res?.data?.list || res?.data || [])) || []
      tableData.value = Array.isArray(list) ? list : []
      const total =
        (res && (res.total ?? res?.pagination?.total ?? (Array.isArray(list) ? list.length : 0))) ||
        0
      pagination.total = total
    } catch (error) {
      console.error('加载数据失败:', error)
      ElMessage.error('加载数据失败')
    } finally {
      loading.value = false
    }
  }

  // 搜索
  const handleSearch = () => {
    pagination.current = 1
    loadData()
  }

  // 重置
  const handleReset = () => {
    searchFormState.name = ''
    searchFormState.isActive = undefined
    handleSearch()
  }

  // 刷新
  const handleRefresh = () => {
    loadData()
  }

  // 分页变化
  const handleSizeChange = (size: number) => {
    pagination.size = size
    loadData()
  }
  const handleCurrentChange = (page: number) => {
    pagination.current = page
    loadData()
  }

  // 选择变化
  const handleSelectionChange = (rows: ApiKey[]) => {
    selectedRows.value = rows
  }

  // 切换状态：支持显式目标状态（与 ElSwitch 变更保持一致）
  const handleToggleStatus = async (row: ApiKey & { switching?: boolean }, desired?: boolean) => {
    const next = typeof desired === 'boolean' ? desired : !row.isActive

    // 无权限：提示并回退 UI
    if (!canUpdate.value) {
      ElMessage.warning('没有权限执行此操作')
      // 回退 switch 的显示状态
      row.isActive = !next
      return
    }
    row.switching = true
    try {
      await updateApiKey(row.id, { isActive: next })
      row.isActive = next
      ElMessage.success('状态更新成功')
    } catch {
      ElMessage.error('状态更新失败')
    } finally {
      row.switching = false
    }
  }

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRows.value.length === 0) return
    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${selectedRows.value.length} 条密钥吗？`,
        '提示',
        {
          type: 'warning'
        }
      )
      const results = await Promise.allSettled(selectedRows.value.map((r) => deleteApiKey(r.id)))
      const success = results.filter((r) => r.status === 'fulfilled').length
      const fail = results.length - success
      ElMessage.success(`删除完成：成功 ${success} 条，失败 ${fail} 条`)
      loadData()
    } catch (error) {
      if (error !== 'cancel') ElMessage.error('批量删除失败')
    }
  }

  // 新增/编辑对话框
  const dialogVisible = ref(false)
  const dialogTitle = ref('新增密钥')
  const formData = reactive<Partial<ApiKey>>({
    id: undefined,
    name: '',
    isActive: true,
    permissions: [],
    dailyLimit: undefined,
    totalLimit: undefined,
    expiresAt: undefined
  })

  const formRules: FormRules = {
    name: [{ required: true, message: '请输入名称', trigger: 'blur' }]
  }

  const handleAdd = () => {
    dialogTitle.value = '新增密钥'
    Object.assign(formData, {
      id: undefined,
      name: '',
      isActive: true,
      permissions: [],
      dailyLimit: undefined,
      totalLimit: undefined,
      expiresAt: undefined
    })
    dialogVisible.value = true
  }

  const handleEdit = (row: ApiKey) => {
    dialogTitle.value = '编辑密钥'
    Object.assign(formData, row)
    dialogVisible.value = true
  }

  const handleDelete = async (row: ApiKey) => {
    try {
      await ElMessageBox.confirm(`确定要删除密钥 "${row.name}" 吗？`, '提示', { type: 'warning' })
      await deleteApiKey(row.id)
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {
      if (error !== 'cancel') ElMessage.error('删除失败')
    }
  }

  const handleSubmit = async () => {
    await formRef.value?.validate()
    try {
      if (formData.id) {
        await updateApiKey(formData.id, formData)
        ElMessage.success('更新成功')
      } else {
        const res = await createApiKey(formData)
        const newKey = (res as any)?.key
        ElMessage.success('创建成功')
        if (newKey) {
          await ElMessageBox.alert(`请妥善保存新密钥：\n${newKey}`, '创建成功')
        }
      }
      dialogVisible.value = false
      loadData()
    } catch {
      ElMessage.error(formData.id ? '更新失败' : '创建失败')
    }
  }

  // 刷新/重置密钥
  const handleRefreshKey = async (row: ApiKey & { refreshing?: boolean }) => {
    try {
      await ElMessageBox.confirm(`确定要刷新密钥 "${row.name}" 吗？`, '提示', {
        type: 'warning'
      })
      row.refreshing = true
      const res = await refreshApiKey(row.id)
      const key = (res as any)?.key
      ElMessage.success('刷新成功')
      if (key) await ElMessageBox.alert(`新密钥：\n${key}`, '刷新成功')
    } catch (error) {
      if (error !== 'cancel') ElMessage.error('刷新失败')
    } finally {
      row.refreshing = false
    }
  }

  const handleResetKey = async (row: ApiKey & { refreshing?: boolean }) => {
    try {
      await ElMessageBox.confirm(`确定要重置密钥 "${row.name}" 吗？此操作不可恢复。`, '提示', {
        type: 'warning'
      })
      row.refreshing = true
      const res = await resetApiKey(row.id)
      const key = (res as any)?.key
      ElMessage.success('重置成功')
      if (key) await ElMessageBox.alert(`新密钥：\n${key}`, '重置成功')
    } catch (error) {
      if (error !== 'cancel') ElMessage.error('重置失败')
    } finally {
      row.refreshing = false
    }
  }

  // 复制密钥
  const handleCopyKey = (row: ApiKey) => {
    const val = row?.key || ''
    if (!val) {
      ElMessage.warning('无可复制的密钥')
      return
    }
    const ok = copyText(val)
    if (ok) ElMessage.success('已复制到剪贴板')
    else ElMessage.error('复制失败')
  }

  // 工具
  const maskKey = (val?: string) => {
    if (!val) return '-'
    if (val.length <= 10) return val
    return `${val.slice(0, 4)}****${val.slice(-4)}`
  }
  const formatDate = (val?: string) => {
    if (!val) return '-'
    const d = new Date(val)
    if (Number.isNaN(d.getTime())) return String(val)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
  }

  // 初始化
  onMounted(() => {
    // 列显示持久化：加载
    try {
      const saved = localStorage.getItem(COLS_STORAGE_KEY)
      if (saved) {
        const arr: Array<{ prop: string; checked?: boolean }> = JSON.parse(saved)
        if (Array.isArray(arr) && arr.length) {
          const idx = new Map(arr.map((it, i) => [it.prop, i]))
          const next = [...columnChecks.value]
            .sort((a: any, b: any) => {
              const ai = idx.has(getColumnKey(a)) ? (idx.get(getColumnKey(a)) as number) : 1e9
              const bi = idx.has(getColumnKey(b)) ? (idx.get(getColumnKey(b)) as number) : 1e9
              return ai - bi
            })
            .map((c: any) => {
              const key = getColumnKey(c)
              const s = arr.find((it) => it.prop === key)
              return s ? { ...c, checked: s.checked ?? true } : c
            })
          columnChecks.value = next
        }
      }
    } catch (e) {
      console.warn('列配置读取失败', e)
    }
    loadPermissions()
    loadData()
  })
</script>

<style scoped lang="scss">

  /* 对齐模型列表页的操作区样式 */
  .op-btns {
    display: flex;
    gap: 0px;
    justify-content: center;
    align-items: center;
    position: relative;
    white-space: nowrap;
    overflow: visible;
  }

  .op-btn {
    --el-button-padding-horizontal: 0;
    --el-button-padding-vertical: 0;
    --el-button-border-color: transparent;
    --el-button-hover-border-color: transparent;
    --el-button-active-border-color: transparent;
    --el-button-bg-color: transparent;
    --el-button-hover-bg-color: transparent;
    --el-button-active-bg-color: transparent;
    --el-button-text-color: inherit;
    --el-button-hover-text-color: inherit;
    --el-button-active-text-color: inherit;
    border: none !important;
    box-shadow: none !important;
    height: 34px;
    width: 34px;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 6px !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 34px;
    overflow: hidden;
  }

  .op-btn > i,
  .op-btn > span,
  .op-btn :deep(svg) {
    margin: 0 !important;
    padding: 0 !important;
    line-height: 1 !important;
    width: 16px !important;
    height: 16px !important;
    font-size: 16px !important;
  }

  /* 统一 hover/active/disabled 行为（不变色不加阴影） */
  .op-btn:hover,
  .op-btn:focus,
  .op-btn:active {
    background: inherit !important;
    color: inherit !important;
    border: none !important;
    box-shadow: none !important;
    filter: none !important;
  }
  .op-btn.is-disabled,
  .op-btn.is-disabled:hover,
  .op-btn.is-disabled:active,
  .op-btn:disabled,
  .op-btn[disabled] {
    opacity: 1 !important;
    border: none !important;
    box-shadow: none !important;
    filter: none !important;
    cursor: not-allowed !important;
  }
  :deep(.el-button.op-btn.is-disabled),
  :deep(.el-button.op-btn.is-disabled:hover),
  :deep(.el-button.op-btn.is-disabled:active),
  :deep(.el-button.op-btn:disabled),
  :deep(.el-button.op-btn[disabled]) {
    background-color: inherit !important;
    color: inherit !important;
    box-shadow: none !important;
    filter: none !important;
  }

  /* 各按钮配色 */
  .op-refresh {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
    --el-button-hover-bg-color: var(--el-color-success-light-9);
    --el-button-hover-text-color: var(--el-color-success);
    --el-button-disabled-bg-color: var(--el-color-success-light-9);
    --el-button-disabled-text-color: var(--el-color-success);
  }
  .op-reset {
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
    --el-button-hover-bg-color: var(--el-color-warning-light-9);
    --el-button-hover-text-color: var(--el-color-warning);
    --el-button-disabled-bg-color: var(--el-color-warning-light-9);
    --el-button-disabled-text-color: var(--el-color-warning);
  }
  .op-edit,
  .op-view {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
  .op-delete {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }

  /* KEY 样式与权限标签容器 */
  .mono {
    font-family: var(
      --art-font-mono,
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      'Liberation Mono',
      'Courier New',
      monospace
    );
  }
  .key-cell {
    display: inline-block;
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .key-cell-wrap {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .key-copy {
    cursor: pointer;
    color: var(--el-color-primary);
  }
  .key-copy:hover {
    color: var(--el-color-primary-dark-2);
  }
  .perm-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .text-muted {
    color: var(--el-text-color-secondary);
  }

  /* 简洁转圈（与模型页一致大小） */
  @keyframes art-rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  .spinning {
    display: inline-block;
    animation: art-rotate 1s linear infinite;
  }
  .spinner-dash {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px dashed currentColor;
    animation: art-rotate 1s linear infinite;
    box-sizing: border-box;
  }
</style>
