<template>
  <div class="art-page-view">
    <!-- 搜索区域 -->
    <ArtSearchBar
      ref="searchBarRef"
      v-model="searchFormModel"
      :items="searchItems"
      :rules="rules"
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
          <h4>模型列表</h4>
          <div class="table-info">
            <ElTag v-if="loading" type="warning">加载中...</ElTag>
            <ElTag v-else type="success">{{ tableData.length }} 个模型</ElTag>
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
          <ElButton type="primary" @click="handleAdd">
            <ElIcon><Plus /></ElIcon>
            新增模型
          </ElButton>
          <ElButton @click="handleBatchDelete" :disabled="selectedRows.length === 0">
            <ElIcon><Delete /></ElIcon>
            批量删除 ({{ selectedRows.length }})
          </ElButton>
          <ElButton @click="handleBatchTest" :disabled="selectedRows.length === 0">
            <ElIcon><Connection /></ElIcon>
            批量测试 ({{ selectedRows.length }})
          </ElButton>
        </template>
      </ArtTableHeader>

      <!-- 表格主体 -->
      <ArtTable
        ref="tableRef"
        :loading="loading"
        :pagination="pagination"
        :data="tableData"
        :columns="visibleColumns"
        @selection-change="handleSelectionChange"
        @pagination:size-change="handleSizeChange"
        @pagination:current-change="handleCurrentChange"
      >
        <!-- 服务商列 -->
        <template #provider="{ row }">
          {{ providerText(row.provider) }}
        </template>
        <!-- 模型类型列 -->
        <template #modelType="{ row }">
          <ElTag type="info">{{ typeText(row.modelType) }}</ElTag>
        </template>

        <!-- 角色列（内联切换） -->
        <template #role="{ row }">
          <div v-if="row.editingRole" class="role-edit">
            <ElSelect
              v-model="row.role"
              size="small"
              class="compact-select"
              style="width: 88px"
              :ref="(el) => setRoleSelectRef(row.id, el)"
              @change="(val) => onRoleChange(row, val)"
              @visible-change="(v) => onRoleVisibleChange(row, v)"
            >
              <ElOption label="主模型" value="primary" />
              <ElOption label="副模型" value="secondary" />
            </ElSelect>
          </div>
          <div v-else>
            <ElTag
              v-if="row.role === 'primary'"
              class="clickable"
              type="success"
              @click="handleRoleEdit(row)"
            >
              主模型
            </ElTag>
            <ElTag
              v-else-if="row.role === 'secondary'"
              class="clickable"
              type="warning"
              @click="handleRoleEdit(row)"
            >
              副模型
            </ElTag>
            <ElTag v-else type="info" class="clickable" @click="handleRoleEdit(row)">
              未设置
            </ElTag>
          </div>
        </template>

        <!-- 优先级列（内联编辑） -->
        <template #priority="{ row }">
          <div v-if="row.editingPriority" class="priority-edit">
            <ElSelect
              v-model="row.priority"
              size="small"
              class="compact-select"
              style="width: 56px"
              :ref="(el) => setPrioritySelectRef(row.id, el)"
              @change="(val) => onPriorityChange(row, val)"
              @visible-change="(v) => onPriorityVisibleChange(row, v)"
            >
              <ElOption v-for="n in 10" :key="n" :label="String(n)" :value="n" />
            </ElSelect>
          </div>
          <div v-else class="priority-view">
            <ElTag class="clickable" @click="handlePriorityEdit(row)">
              {{ row.priority ?? '-' }}
            </ElTag>
          </div>
        </template>

        <!-- 状态列 -->
        <template #enabled="{ row }">
          <ElSwitch
            v-model="row.enabled"
            :loading="row.switching"
            @change="() => handleToggleStatus(row)"
          />
        </template>

        <!-- 成本列 -->
        <!-- 创建时间列 -->
        <template #createdAt="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>

        <!-- 操作列 -->
        <template #operation="{ row }">
          <div class="op-btns">
            <span v-if="row.testStatus === 'success'" class="latency-overlay">
              {{ formatLatency(row.testLatency) }}
            </span>
            <ElTooltip content="测试连接" placement="top">
              <ElButton
                class="op-btn op-test"
                :class="{
                  'is-running': row.testStatus === 'running',
                  'is-success': row.testStatus === 'success',
                  'is-fail': row.testStatus === 'fail'
                }"
                @click="handleTestConnection(row)"
                :disabled="row.testStatus === 'running'"
              >
                <span v-if="row.testStatus === 'running'" class="spinner-dash"></span>
                <i
                  v-else-if="row.testStatus === 'success'"
                  class="iconfont-sys iconsys-chenggong1"
                />
                <i v-else-if="row.testStatus === 'fail'" class="iconfont-sys iconsys-zhifushibai" />
                <i v-else class="iconfont-sys iconsys-lianjie" />
              </ElButton>
            </ElTooltip>
            <!-- 查看放在测试后面 -->
            <ElTooltip content="查看详情" placement="top">
              <ElButton class="op-btn op-view" @click="handleView(row)">
                <i class="iconfont-sys iconsys-liulan" />
              </ElButton>
            </ElTooltip>
            <ElTooltip content="编辑" placement="top">
              <ElButton class="op-btn op-edit" @click="handleEdit(row)">
                <i class="iconfont-sys iconsys-bianji2" />
              </ElButton>
            </ElTooltip>
            <ElTooltip content="删除" placement="top">
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
      width="600px"
      :close-on-click-modal="false"
      :align-center="true"
    >
      <ElForm ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <ElFormItem label="模型名称">
          <div style="display: flex; gap: 8px; width: 100%">
            <ElSelect
              v-model="batchSelectedIds"
              multiple
              filterable
              allow-create
              default-first-option
              collapse-tags
              collapse-tags-tooltip
              clearable
              placeholder="可输入或从下拉选择模型ID（可多选）"
              style="flex: 1"
            >
              <ElOption v-for="m in providerModels" :key="m.id" :label="m.id" :value="m.id" />
            </ElSelect>
            <ElButton
              type="primary"
              :loading="fetchingModels"
              :disabled="!formData.provider"
              @click="handleFetchProviderModels"
            >
              拉取模型列表
            </ElButton>
          </div>
        </ElFormItem>
        <ElFormItem label="服务商" prop="provider">
          <ElSelect
            v-model="formData.provider"
            placeholder="请选择服务商"
            :loading="providersLoading"
            :disabled="providersLoading || providersList.length === 0"
            @change="onProviderChange"
          >
            <ElOption
              v-for="provider in providersList"
              :key="provider.id"
              :label="provider.displayName"
              :value="provider.name"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="API密钥" prop="apiKey">
          <ElInput
            v-model="formData.apiKey"
            type="password"
            placeholder="请输入API密钥"
            show-password
          />
        </ElFormItem>
        <ElFormItem label="模型角色" prop="role">
          <ElRadioGroup v-model="formData.role">
            <ElRadio value="primary">主模型</ElRadio>
            <ElRadio value="secondary">副模型</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem label="优先级" prop="priority">
          <ElSelect v-model="formData.priority" placeholder="请选择优先级">
            <ElOption v-for="n in 10" :key="n" :label="String(n)" :value="n" />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="成本/1K" prop="costPer1kTokens">
          <ElInput
            v-model="formData.costPer1kTokens"
            inputmode="decimal"
            placeholder="请输入成本/1K Tokens，例如 0.0050"
            clearable
          />
        </ElFormItem>
        <ElFormItem label="上下文窗口" prop="contextWindow">
          <ElInput
            v-model="formData.contextWindow"
            inputmode="numeric"
            placeholder="请输入上下文窗口，例如 128000"
            clearable
          />
        </ElFormItem>
        <ElFormItem label="启用状态" prop="enabled">
          <ElSwitch v-model="formData.enabled" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>

    <!-- 详情抽屉 -->
    <ElDrawer v-model="detailVisible" title="模型详情" size="40%">
      <ElDescriptions :column="1" border>
        <ElDescriptionsItem label="模型名称">{{ detailData?.name || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="服务商">
          {{ providerText(detailData?.provider) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="模型类型">
          <ElTag type="info">{{ typeText(detailData?.modelType) }}</ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="角色">
          <ElTag v-if="detailData?.role === 'primary'" type="success">主模型</ElTag>
          <ElTag v-else-if="detailData?.role === 'secondary'" type="warning">副模型</ElTag>
          <ElTag v-else>未设置</ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="优先级">{{ detailData?.priority ?? '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="成本/1K">
          ¥{{ formatCost(detailData?.costPer1kTokens as any) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="上下文窗口">
          {{ detailData?.contextWindow || '-' }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="启用状态">
          <ElTag :type="detailData?.isActive ? 'success' : 'info'">
            {{ detailData?.isActive ? '启用' : '禁用' }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="API密钥">
          <span>{{ apiKeyVisible ? detailRealApiKey() : '••••••••' }}</span>
          <ElButton
            text
            type="primary"
            @click="apiKeyVisible = !apiKeyVisible"
            style="margin-left: 8px"
          >
            {{ apiKeyVisible ? '隐藏' : '显示' }}
          </ElButton>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="创建时间">
          {{ formatDate(detailData?.createdAt as any) }}
        </ElDescriptionsItem>
      </ElDescriptions>
      <div style="margin-top: 12px">
        <ElButton
          type="primary"
          @click="detailData && handleTestConnection(detailData)"
          :disabled="detailData?.testStatus === 'running'"
        >
          <span v-if="detailData?.testStatus === 'running'" class="spinner-dash"></span>
          <i
            v-else-if="detailData?.testStatus === 'success'"
            class="iconfont-sys iconsys-chenggong1"
          />
          <i
            v-else-if="detailData?.testStatus === 'fail'"
            class="iconfont-sys iconsys-zhifushibai"
          />
          <i v-else class="iconfont-sys iconsys-lianjie" />
          测试连接
          <span v-if="detailData?.testStatus === 'success'" style="margin-left: 6px">
            {{ formatLatency(detailData?.testLatency) }}
          </span>
        </ElButton>
        <ElButton @click="refreshDetail">
          <ElIcon><RefreshRight /></ElIcon>
          刷新
        </ElButton>
      </div>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted, onBeforeUnmount, onActivated, nextTick } from 'vue'
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
    ElRadioGroup,
    ElRadio,
    ElTooltip,
    ElDrawer,
    ElDescriptions,
    ElDescriptionsItem
  } from 'element-plus'
  import { Plus, Delete, Connection, RefreshRight } from '@element-plus/icons-vue'
  import type { FormRules } from 'element-plus'
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import ArtTableHeader from '@/components/core/tables/art-table-header/index.vue'
  import ArtSearchBar from '@/components/core/forms/art-search-bar/index.vue'
  import type { ColumnOption } from '@/types/component'
  import {
    getAIModels,
    getAIModel,
    createAIModel,
    updateAIModel,
    deleteAIModel,
    testAIModelConnection,
    getActiveProviders,
    fetchProviderModels,
    type AIModel,
    type AIProvider
  } from '@/api/ai-models'

  // AI模型接口（扩展API定义的接口）
  interface AIModelExtended extends Omit<AIModel, 'provider'> {
    provider:
      | string
      | {
          id: number
          name: string
          displayName: string
        }

    apiKey: string
    baseUrl?: string
    model: string
    enabled: boolean
    switching?: boolean
    testing?: boolean
    testStatus?: 'idle' | 'running' | 'success' | 'fail'
    testLatency?: number
  }

  // 批量创建：根据已选择的 providerModels 的 id 批量创建模型
  const batchSelectedIds = ref<string[]>([])

  // 服务商切换：先清空旧密钥与模型列表，避免跨服务商残留；再按新服务商从缓存或可用字段回填
  const onProviderChange = async () => {
    const providerName = String(formData.provider || '')

    // 先清空，确保不会保留上一个服务商的真实密钥
    formData.apiKey = ''
    // 清空已拉取的模型列表
    providerModels.value = []

    if (!providerName) return

    // 1) 优先使用会话缓存中的真实明文密钥
    // 清空批量选择
    batchSelectedIds.value = []
    const cached = cachedApiKeyMap.value[providerName]
    if (typeof cached === 'string' && cached && !isMaskedKey(cached)) {
      formData.apiKey = cached
      return
    }

    // 2) 若无缓存，尝试从已加载的服务商列表上可用字段推断（仅明文）
    try {
      const isRealKeyCandidate = (v?: any) => typeof v === 'string' && v && !isMaskedKey(String(v))
      const p: any = (providersList.value || []).find((it: any) => it?.name === providerName)
      if (p) {
        const candidates = [p.apiKeyDecrypted, p.apiKeyPlain, p.apiKey]
        const real = candidates.find(isRealKeyCandidate)
        if (real) {
          const realStr = String(real)
          formData.apiKey = realStr
          // 写入缓存，提升后续切换体验
          cachedApiKeyMap.value[providerName] = realStr
          saveApiKeyCache()
        } else {
          // 无可用明文则保持为空，不再弹提示，遵循静默策略
        }
      }
    } catch {
      // ignore
    }
  }

  // 拉取指定服务商的模型列表
  const providerModels = ref<Array<{ id: string; name?: string; type?: string }>>([])
  const fetchingModels = ref(false)
  const handleFetchProviderModels = async () => {
    if (!formData.provider) {
      ElMessage.warning('请先选择服务商')
      return
    }
    try {
      fetchingModels.value = true
      const res: any = await fetchProviderModels({
        provider: String(formData.provider),
        apiKey: String(formData.apiKey || '')
      })
      const list = (res && (res.data || res.list)) || res || []
      const rawList = Array.isArray(list) ? list : []
      providerModels.value = rawList.map((m: any) => {
        if (m && typeof m === 'object' && (m.id || m.name)) {
          const id = m.id ?? m.name
          return { id: String(id), name: m.name ? String(m.name) : String(id), type: m.type }
        }
        const s = String(m)
        return { id: s, name: s }
      })
      ElMessage.success(`已拉取 ${providerModels.value.length} 个模型`)
      if (batchSelectedIds.value.length === 0 && providerModels.value.length > 0) {
        batchSelectedIds.value = [providerModels.value[0].id]
      }
    } catch (err: any) {
      const msg = err?.message || err?.data?.message || '拉取模型列表失败'
      ElMessage.error(msg)
    } finally {
      fetchingModels.value = false
    }
  }

  // 表格引用
  const tableRef = ref()
  const searchBarRef = ref()
  const formRef = ref()

  // 状态
  const loading = ref(false)
  const tableData = ref<AIModelExtended[]>([])
  const selectedRows = ref<AIModelExtended[]>([])

  // 优先级管理相关
  const prioritySelectRef = ref<Record<number, any>>({})

  const setPrioritySelectRef = (id: number, el: any) => {
    if (el) prioritySelectRef.value[id] = el
  }

  const openPriorityDropdown = (id: number) => {
    const sel = prioritySelectRef.value[id]
    try {
      sel?.focus?.()
      sel?.toggleMenu?.()
    } catch {
      /* ignore */
    }
    try {
      sel?.$el?.click?.()
    } catch {
      /* ignore */
    }
  }

  // 优先级变更处理（与模板调用顺序保持一致：onPriorityChange(row, val)）
  const onPriorityChange = async (row: AIModelExtended, value: number) => {
    try {
      await updateAIModel(row.id, { priority: value })
      row.priority = value
      Object.assign(row as any, { editingPriority: false })
      ElMessage.success('优先级更新成功')
    } catch {
      ElMessage.error('优先级更新失败')
    }
  }

  // 优先级下拉可见性变更
  const onPriorityVisibleChange = (row: AIModelExtended, visible: boolean) => {
    if (!visible) (row as any).editingPriority = false
  }

  // 开始编辑优先级：进入编辑态并展开下拉，不立刻提交
  const handlePriorityEdit = (row: AIModelExtended) => {
    Object.assign(row as any, { editingPriority: true })
    nextTick(() => openPriorityDropdown(row.id))
  }

  const dialogVisible = ref(false)
  const dialogTitle = ref('新增模型')
  const detailVisible = ref(false) // 详情数据
  const detailData = ref<AIModelExtended | null>(null)
  const apiKeyVisible = ref(false)
  const providersList = ref<AIProvider[]>([])
  const providersLoading = ref(false)
  // 会话级服务商密钥缓存 { [providerName]: realApiKey }
  const cachedApiKeyMap = ref<Record<string, string>>({})
  // 记录表单打开时（编辑态）预填的密钥，用于判断是否被用户修改
  const prefilledApiKey = ref<string>('')

  const cacheStorageKey = 'ai-provider-apikey-cache'
  const loadApiKeyCache = () => {
    try {
      const raw = sessionStorage.getItem(cacheStorageKey)
      cachedApiKeyMap.value = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    } catch {
      cachedApiKeyMap.value = {}
    }
  }
  const saveApiKeyCache = () => {
    try {
      sessionStorage.setItem(cacheStorageKey, JSON.stringify(cachedApiKeyMap.value))
    } catch {
      /* ignore */
    }
  }

  // 判断一个密钥是否可能为“掩码/脱敏”
  const isMaskedKey = (val: string) => {
    if (!val || typeof val !== 'string') return false
    const s = val.trim()
    if (!s) return false
    const masked = (s.match(/[＊*•]/g) || []).length
    const visible = s.replace(/[＊*•]/g, '').replace(/\s/g, '').length
    return masked >= 6 && visible <= 4
  }

  // 判定候选值是否为可用的真实密钥（非空、字符串、且非掩码）
  const isRealKeyCandidate = (v: unknown) => typeof v === 'string' && v && !isMaskedKey(String(v))

  // 搜索表单
  const searchFormState = reactive<Record<string, any>>({
    name: '',
    provider: '',
    enabled: undefined
  })

  // 搜索配置（使用computed动态生成服务商选项）
  const searchItems = computed(() => [
    {
      key: 'name',
      label: '模型名称',
      type: 'input',
      props: {
        placeholder: '请输入模型名称',
        clearable: true
      }
    },
    {
      key: 'provider',
      label: '服务商',
      type: 'select',
      props: {
        placeholder: '请选择服务商',
        clearable: true,
        options: [
          { label: '全部', value: '' },
          ...providersList.value.map((p) => ({
            label: p.displayName,
            value: p.name
          }))
        ]
      }
    },
    {
      key: 'enabled',
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

  // v-model 包装器：避免将 const reactive 作为整体被赋值
  const searchFormModel = computed<Record<string, any>>({
    get: () => searchFormState,
    set: (v) => Object.assign(searchFormState, v || {})
  })

  const rules = {}

  // 分页
  const pagination = reactive({
    current: 1,
    size: 10,
    total: 0
  })

  // 新增/编辑表单
  const formData = reactive<any>({
    id: undefined,
    name: '',
    displayName: '',
    provider: '',
    apiKey: '',
    baseUrl: '',
    model: '',
    role: 'primary',
    priority: 5,
    costPer1kTokens: 0,
    contextWindow: 4000,
    enabled: true
  })

  // 表单规则
  const formRules: FormRules = {
    provider: [{ required: true, message: '请选择服务商', trigger: 'change' }],
    // 创建时必填；编辑时可留空表示不修改
    apiKey: [
      {
        validator: (_rule, value, callback) => {
          const creating = !formData.id
          if (creating && (!value || String(value).trim() === '')) {
            callback(new Error('请输入API密钥'))
            return
          }
          callback()
        },
        trigger: 'blur'
      }
    ],
    costPer1kTokens: [
      {
        validator: (_rule, value, callback) => {
          if (value === undefined || value === null || value === '') {
            callback()
            return
          }
          const num = Number(value)
          if (!Number.isNaN(num) && num >= 0) {
            callback()
          } else {
            callback(new Error('成本不能为负数'))
          }
        },
        trigger: 'change'
      }
    ],
    contextWindow: [
      {
        validator: (_rule, value, callback) => {
          if (value === undefined || value === null || value === '') {
            callback()
            return
          }
          const num = Number(value)
          if (Number.isInteger(num) && num >= 0) {
            callback()
          } else {
            callback(new Error('上下文窗口需为非负整数'))
          }
        },
        trigger: 'change'
      }
    ]
  }

  // 表格列配置（移除显示名称/角色列；主表格不展示“模型”“成本/1K tokens”“上下文窗口”）
  const columns = ref<ColumnOption[]>([
    { type: 'selection', width: 55 },
    { prop: 'name', label: '模型名称', minWidth: 120 },
    { prop: 'provider', label: '服务商', width: 120, useSlot: true },
    { prop: 'modelType', label: '模型类型', width: 100, useSlot: true },
    { prop: 'role', label: '角色', width: 100, useSlot: true },
    { prop: 'priority', label: '优先级', width: 120, useSlot: true },
    { prop: 'enabled', label: '状态', width: 90, useSlot: true },
    { prop: 'createdAt', label: '创建时间', minWidth: 160, useSlot: true },
    { prop: 'operation', label: '操作', width: 200, fixed: 'right', useSlot: true }
  ])

  // 列显示控制
  const columnChecks = ref<ColumnOption[]>(columns.value.map((c) => ({ ...c, checked: true })))
  const visibleColumns = computed<ColumnOption[]>(() => {
    const base = columns.value
    const byKey = (c: ColumnOption) => (c.prop as string) || (c.type as string)
    const baseMap = new Map(base.map((c) => [byKey(c), c]))
    return (columnChecks.value || [])
      .filter((c: any) => c && (c as any).checked !== false)
      .map((c: any) => baseMap.get(byKey(c)))
      .filter(Boolean) as ColumnOption[]
  })

  // 加载数据（保留原有的完整实现）
  const loadData = async (params?: Record<string, any>) => {
    loading.value = true
    try {
      const queryParams: Record<string, any> = {
        page: pagination.current,
        limit: pagination.size,
        ...searchFormState,
        ...params
      }

      // 过滤空值
      Object.keys(queryParams).forEach((key) => {
        if (queryParams[key] === '' || queryParams[key] === undefined) {
          delete queryParams[key]
        }
      })

      const res: any = await getAIModels(queryParams)

      const list = (res && (res.data || res.list)) || []
      tableData.value = list.map((item: any) => {
        const providerKey = typeof item.provider === 'string' ? item.provider : item?.provider?.name
        return {
          ...item,
          // 兼容后端字段
          provider: providerText(providerKey) || providerKey || '-',
          model: item?.model || item?.name,
          enabled: item?.enabled ?? item?.isActive ?? false,
          switching: false,
          testing: false,
          testStatus: 'idle',
          testLatency: undefined,
          editingPriority: false
        }
      })
      const total = (res && (res.total ?? res?.pagination?.total)) || 0
      pagination.total = total
    } catch {
      ElMessage.error('加载数据失败')
    } finally {
      loading.value = false
    }
  }

  // 角色内联切换（紧凑下拉）
  const roleSelectRefs = ref<Record<number, any>>({})
  const setRoleSelectRef = (id: number, el: any) => {
    if (el) roleSelectRefs.value[id] = el
  }

  const openRoleDropdown = (id: number) => {
    const sel = roleSelectRefs.value[id]
    try {
      sel?.focus?.()
      sel?.toggleMenu?.()
    } catch {
      /* ignore */
    }
    try {
      sel?.$el?.click?.()
    } catch {
      /* ignore */
    }
  }

  const handleRoleEdit = (row: AIModel) => {
    Object.assign(row as any, { _roleBackup: row.role })
    // 未设置时，默认给一个值以便展示
    if (!row.role) row.role = 'secondary'
    Object.assign(row as any, { editingRole: true })
    nextTick(() => openRoleDropdown(row.id))
  }

  const onRoleChange = async (row: AIModel, val: 'primary' | 'secondary') => {
    const prev = (row as any)._roleBackup
    try {
      await updateAIModel(row.id, { role: val } as any)
      ElMessage.success('角色已更新')
      Object.assign(row as any, { editingRole: false })
    } catch {
      row.role = prev
      ElMessage.error('更新角色失败')
      Object.assign(row as any, { editingRole: false })
    }
  }

  const onRoleVisibleChange = (row: AIModel, visible: boolean) => {
    if (!visible) {
      Object.assign(row as any, { editingRole: false })
      // 关闭时如果之前未设置且用户未选择，回退
      const prev = (row as any)._roleBackup
      if (prev === undefined) row.role = undefined as any
    }
  }
  // 搜索
  const handleSearch = () => {
    const params: Record<string, any> = {
      ...searchFormState,
      page: 1,
      limit: pagination.size
    }
    // 清理空参数
    Object.keys(params).forEach((key) => {
      if (params[key] === '' || params[key] === undefined) {
        delete params[key]
      }
    })
    loadData(params)
  }

  // 重置
  const handleReset = () => {
    searchFormState.name = ''
    searchFormState.provider = ''
    searchFormState.enabled = undefined
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
  const handleSelectionChange = (selections: AIModelExtended[]) => {
    selectedRows.value = selections
  }

  // 批量测试连接（与单个测试一致：记录耗时并保持状态显示，不刷新列表）
  const handleBatchTest = async () => {
    if (selectedRows.value.length === 0) {
      ElMessage.warning('请先选择要测试的模型')
      return
    }

    const rows = [...selectedRows.value]
    const results = await Promise.allSettled(
      rows.map(async (row) => {
        row.testStatus = 'running'
        try {
          const start = Date.now()
          const res: any = await testAIModelConnection(row.id)
          const latencySec = typeof res?.responseTime === 'number'
            ? Number(res.responseTime) / 1000
            : (Date.now() - start) / 1000
          if (res?.success === true) {
            row.testLatency = latencySec
            row.testStatus = 'success'
            return 'success'
          } else {
            row.testStatus = 'fail'
            row.testLatency = undefined
            throw new Error(res?.message || 'failed')
          }
        } catch (e: any) {
          row.testStatus = 'fail'
          row.testLatency = undefined
          throw new Error(e?.message || 'failed')
        }
      })
    )

    const successCount = results.filter((r) => r.status === 'fulfilled').length
    const failCount = results.filter((r) => r.status === 'rejected').length

    ElMessage.info(`测试完成：成功 ${successCount} 个，失败 ${failCount} 个`)
    // 不调用 loadData()，以便保留图标状态与耗时显示；刷新或切换页面后会复原
  }

  // 批量更新
  // 已移除未使用的批量更新方法，避免类型与未用报错

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRows.value.length === 0) return

    try {
      await ElMessageBox.confirm(
        `确定要删除选中的 ${selectedRows.value.length} 个模型吗？`,
        '批量删除',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )

      // 批量删除API调用
      await Promise.all(selectedRows.value.map((row) => deleteAIModel(row.id)))
      ElMessage.success('批量删除成功')
      loadData()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('批量删除失败')
      }
    }
  }

  // 新增
  const handleAdd = async () => {
    dialogTitle.value = '新增模型'
    Object.assign(formData, {
      id: undefined,
      name: '',
      provider: '',
      apiKey: '',
      baseUrl: '',
      model: '',
      role: 'primary',
      priority: 5,
      costPer1kTokens: 0,
      contextWindow: 4000,
      enabled: true
    })
    batchSelectedIds.value = []
    prefilledApiKey.value = ''
    providerModels.value = []
    // 先打开对话框，提升交互响应速度
    dialogVisible.value = true
    // 仅在本地无缓存时才触发加载，且不阻塞UI
    if (!providersList.value || providersList.value.length === 0) {
      void fetchProviders()
    }
  }

  // 编辑：打开编辑对话框并预填表单数据（不打开详情抽屉）
  const handleEdit = async (row: AIModelExtended) => {
    dialogTitle.value = '编辑模型'
    const providerName =
      typeof row.provider === 'object'
        ? row.provider?.name
        : (() => {
            const s = String(row.provider || '')
            const m = (providersList.value || []).find((p) => p.displayName === s || p.name === s)
            return m?.name || s
          })()
    Object.assign(formData, {
      id: row.id,
      name: row.name || '',
      displayName: (row as any).displayName ?? row.name ?? '',
      provider: providerName,
      // 先置空，随后通过详情接口填充真实密钥
      apiKey: '',
      baseUrl: (row as any).baseUrl || '',
      // 去掉“模型ID”编辑项，保留内部值用于兼容后端（若存在）
      model: row.model || row.name || '',
      role: (row as any).role || 'secondary',
      priority: (row as any).priority ?? 5,
      costPer1kTokens: (row as any).costPer1kTokens ?? 0,
      contextWindow: (row as any).contextWindow ?? 0,
      enabled: (row as any).enabled ?? (row as any).isActive ?? true
    })

    // 打开对话框
    dialogVisible.value = true
    providerModels.value = []

    // 懒加载服务商列表
    if (!providersList.value || providersList.value.length === 0) {
      void fetchProviders()
    }

    // 加载数据库中的真实密钥并回填（密码框会默认隐藏，用户可点击眼睛查看）
    try {
      const data = await getAIModel(row.id)
      const prov =
        typeof data.provider === 'object'
          ? data.provider.name
          : String(data.provider || providerName)
      formData.provider = prov
      const realCandidates = [
        (data as any).apiKeyDecrypted,
        (data as any).apiKeyPlain,
        (data as any).apiKey
      ]
      const fetchedReal: string = (realCandidates.find(isRealKeyCandidate) as string) || ''
      const fromCache = cachedApiKeyMap.value[prov]
      // 仅使用真实明文密钥进行回填，避免显示掩码/加密值
      formData.apiKey =
        typeof fromCache === 'string' && fromCache && !isMaskedKey(String(fromCache))
          ? fromCache
          : fetchedReal
      // 记录预填值，用于提交时判断是否未修改
      prefilledApiKey.value = formData.apiKey || ''
      formData.baseUrl = (data as any).customApiUrl || (data as any).baseUrl || formData.baseUrl
      // 将“拉取到的明文密钥”写入会话缓存
      if (!fromCache && fetchedReal) {
        cachedApiKeyMap.value[prov] = fetchedReal
        saveApiKeyCache()
      }
    } catch {
      // ignore
    }
  }

  // 获取服务商列表
  const fetchProviders = async (force = false) => {
    // 已在加载或已有数据则不再请求，避免重复；force=true 时忽略缓存
    if (providersLoading.value) return
    if (!force && providersList.value && providersList.value.length > 0) return
    providersLoading.value = true
    try {
      const response = await getActiveProviders()
      providersList.value = response || []
      // 同步缓存：仅当服务商返回了"明显为明文"的密钥字段时缓存
      let cachedAny = false
      for (const p of providersList.value as any[]) {
        if (!p || !p.name) continue
        const candidates = [p.apiKeyDecrypted, p.apiKeyPlain, p.apiKey]
        const key = candidates.find(isRealKeyCandidate)
        if (typeof key === 'string' && key) {
          cachedApiKeyMap.value[p.name] = key
          cachedAny = true
        }
      }
      if (cachedAny) saveApiKeyCache()
    } catch {
      /* ignore */
    } finally {
      providersLoading.value = false
    }
  }

  // 测试连接
  const handleTestConnection = async (row: AIModelExtended) => {
    try {
      row.testStatus = 'running'
      const startTime = Date.now()
      const res: any = await testAIModelConnection(row.id)
      const latencySec = typeof res?.responseTime === 'number'
        ? Number(res.responseTime) / 1000
        : (Date.now() - startTime) / 1000
      if (res?.success === true) {
        row.testLatency = latencySec
        row.testStatus = 'success'
        const testedName = (typeof res?.modelName === 'string' && res.modelName) ? res.modelName : row.name
        ElMessage.success(`模型 ${testedName} 连接测试成功`)
      } else {
        row.testStatus = 'fail'
        row.testLatency = undefined
        const testedName = (typeof res?.modelName === 'string' && res.modelName) ? res.modelName : row.name
        ElMessage.error(res?.message || `模型 ${testedName} 连接测试失败`)
      }
    } catch (error: any) {
      row.testStatus = 'fail'
      row.testLatency = undefined
      ElMessage.error(error?.message || `模型 ${row.name} 连接测试失败`)
    }
  }

  // 查看详情
  const handleView = async (row: AIModelExtended) => {
    detailData.value = { ...row }
    detailVisible.value = true
    apiKeyVisible.value = false
    await refreshDetail()
  }

  // 刷新详情
  const refreshDetail = async () => {
    if (!detailData.value) return
    try {
      const data = await getAIModel(detailData.value.id)
      // 转换provider格式
      const provider = typeof data.provider === 'object' ? data.provider.name : data.provider
      detailData.value = {
        ...detailData.value,
        ...data,
        provider,
        apiKey: data.apiKeyEncrypted || '',
        model: data.displayName,
        enabled: data.isActive
      }
      // 仅当详情接口返回了明文密钥字段时缓存（排除掩码，优先 decrypted/plain）
      const realCandidates = [
        (data as any).apiKeyDecrypted,
        (data as any).apiKeyPlain,
        (data as any).apiKey
      ]
      const fetchedReal: string = (realCandidates.find(isRealKeyCandidate) as string) || ''
      if (provider && fetchedReal) {
        cachedApiKeyMap.value[String(provider)] = fetchedReal
        saveApiKeyCache()
      }
    } catch {
      // ignore
    }
  }

  // 详情抽屉显示真实密钥：优先会话缓存；无缓存则尝试后端字段（apiKey/apiKeyPlain/apiKeyDecrypted/apiKeyEncrypted）；都无则 '-'
  const detailRealApiKey = () => {
    const p = (() => {
      const prov = (detailData.value as any)?.provider
      if (!prov) return ''
      return typeof prov === 'object' ? prov.name : String(prov)
    })()
    const cached = p && cachedApiKeyMap.value[p]
    if (cached && !isMaskedKey(String(cached))) return cached
    const d: any = detailData.value || {}
    const real = [d.apiKeyDecrypted, d.apiKeyPlain, d.apiKey].find(isRealKeyCandidate)
    return real || '-'
  }

  // 删除模型
  const handleDelete = async (row: AIModelExtended) => {
    try {
      await ElMessageBox.confirm(`确定要删除模型 ${row.name} 吗？`, '删除确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await deleteAIModel(row.id)
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {
      if (error !== 'cancel') {
        ElMessage.error('删除失败')
      }
    }
  }

  // 切换状态
  const handleToggleStatus = async (row: AIModelExtended & { switching?: boolean }) => {
    const target = !!row.enabled
    const prev = !target
    row.switching = true
    try {
      await updateAIModel(row.id, { isActive: target } as any)
      row.enabled = target
      ElMessage.success(`${target ? '启用' : '禁用'}成功`)
    } catch {
      row.enabled = prev
      ElMessage.error('状态切换失败')
    } finally {
      row.switching = false
    }
  }

  // 类型文本映射
  const typeText = (type?: string) => {
    const typeMap: Record<string, string> = {
      chat: '聊天',
      completion: '补全',
      embedding: '嵌入',
      rerank: '重排序',
      audio: '音频',
      image: '图像'
    }
    return type ? typeMap[type] || type : '-'
  }

  // 服务商文本映射（优先展示 displayName；否则再使用内置映射；最后回退原字符串）
  const providerText = (provider?: string | { id: number; name: string; displayName: string }) => {
    const providerMap: Record<string, string> = {
      openai: 'OpenAI',
      anthropic: 'Anthropic',
      gemini: 'Gemini',
      azure: 'Azure',
      custom: '自定义'
    }
    if (!provider) return '-'
    // 对象：优先 displayName
    if (typeof provider !== 'string') {
      return provider.displayName || providerMap[provider.name] || provider.name
    }
    // 字符串：尝试从已加载的服务商列表匹配 displayName
    const hit = (providersList.value || []).find((p) => p.name === provider)
    if (hit && hit.displayName) return hit.displayName
    // 映射或回退原值
    return providerMap[provider] || provider
  }

  // 提交表单
  const handleSubmit = async () => {
    await formRef.value?.validate()
    try {
      const basePayload: any = { ...formData }
      // 清理空字段，避免后端校验报错
      if (!basePayload.displayName) delete basePayload.displayName
      if (basePayload.baseUrl === '') delete basePayload.baseUrl
      // 若为空，则不提交 apiKey，保持后端密钥不变
      if (
        basePayload.apiKey === '' ||
        basePayload.apiKey === undefined ||
        basePayload.apiKey === null
      ) {
        delete basePayload.apiKey
      } else if (typeof basePayload.apiKey === 'string' && isMaskedKey(basePayload.apiKey)) {
        // 掩码串不提交、不缓存，避免覆盖真实密钥
        delete basePayload.apiKey
      } else if (basePayload.provider) {
        // 缓存真实密钥（仅明文）
        const p = String(basePayload.provider)
        if (p) {
          cachedApiKeyMap.value[p] = basePayload.apiKey
          saveApiKeyCache()
        }
      }
      // 若未填写模型ID，避免发送空字段
      if (
        basePayload.model === '' ||
        basePayload.model === undefined ||
        basePayload.model === null
      ) {
        delete basePayload.model
      }
      // 编辑保持原逻辑；创建时将 provider 名称映射为 providerId 再提交
      if (formData.id) {
        // 编辑
        await updateAIModel(formData.id, basePayload)
        ElMessage.success('更新成功')
      } else {
        // 新增：按多选模型ID批量创建
        const ids = (batchSelectedIds.value || []).map((s) => String(s).trim()).filter(Boolean)
        if (ids.length === 0) {
          ElMessage.warning('请至少选择一个模型ID')
          return
        }
        // 将所选 provider 名称解析为 providerId（或 'custom'）
        const providerName = String(basePayload.provider || '').trim()
        if (!providerName) {
          ElMessage.error('请选择服务商')
          return
        }
        let resolvedProviderId: number | 'custom' | undefined
        if (providerName === 'custom') {
          resolvedProviderId = 'custom'
        } else {
          const pv = (providersList.value || []).find((x) => x.name === providerName)
          resolvedProviderId = pv?.id
        }
        if (!resolvedProviderId) {
          ElMessage.error('未找到所选服务商，请刷新服务商列表后重试')
          return
        }
        const tasks = ids.map(async (id) => {
          const payload: any = {
            ...basePayload,
            name: id,
            providerId: resolvedProviderId,
            contextWindow: basePayload.contextWindow ?? 4000,
            enabled: basePayload.enabled
          }
          // 移除前端内部字段，避免后端校验报未知字段
          delete payload.provider
          if (!payload.displayName) delete (payload as any).displayName
          if ((payload as any).baseUrl === '') delete (payload as any).baseUrl
          try {
            await createAIModel(payload)
            return { id, ok: true }
          } catch (e) {
            return { id, ok: false, err: e }
          }
        })
        const results = await Promise.allSettled(tasks)
        const fulfilled = results.filter(
          (r) => r.status === 'fulfilled'
        ) as PromiseFulfilledResult<any>[]
        const success = fulfilled.map((r) => r.value).filter((x) => x.ok).length
        const fail = ids.length - success
        ElMessage.success(`创建完成：成功 ${success} 个，失败 ${fail} 个`)
      }
      dialogVisible.value = false
      loadData()
    } catch {
      ElMessage.error(formData.id ? '更新失败' : '创建失败')
    }
  }

  // 成本格式化
  const formatCost = (val?: number) => {
    const num = Number(val ?? 0)
    if (Number.isNaN(num)) return '0.0000'
    return num.toFixed(4)
  }

  // 耗时格式化（秒）
  const formatLatency = (sec?: number) => {
    if (!sec && sec !== 0) return '-'
    return `${sec.toFixed(2)}s`
  }

  // 日期格式化（与服务商管理一致：YYYY-MM-DD HH:mm:ss）
  const formatDate = (date: string) => {
    if (!date) return '-'
    try {
      const d = new Date(date)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    } catch {
      return '-'
    }
  }

  // 初始化
  onMounted(() => {
    // 先加载本地缓存，再拉取服务商（同步可用密钥），最后加载列表
    loadApiKeyCache()
    fetchProviders()
    loadData()
    // 监听服务商变更事件，强制刷新服务商下拉
    const handler = () => fetchProviders(true)
    // 将监听器挂到实例上，便于卸载时移除
    ;(onMounted as any)._provChangedHandler = handler
    window.addEventListener('ai-provider:changed', handler)
  })

  // 卸载时移除全局事件监听，避免泄漏
  onBeforeUnmount(() => {
    const handler = (onMounted as any)._provChangedHandler
    if (handler) {
      try {
        window.removeEventListener('ai-provider:changed', handler)
      } catch {
        /* ignore */
      }
    }
  })
  // 返回页面清空一次性测试状态（keep-alive 下）
  onActivated(() => {
    if (Array.isArray(tableData.value)) {
      tableData.value.forEach((row: any) => {
        row.testStatus = 'idle'
        row.testLatency = undefined
      })
    }
    if (detailData.value) {
      detailData.value.testStatus = 'idle'
      detailData.value.testLatency = undefined
    }
  })
</script>

<style lang="scss" scoped>
  /* 表头布局交由全局 app.scss 统一控制 */
  .op-btns {
    display: flex;
    gap: 0px;
    justify-content: center;
    align-items: center;
    position: relative;
    white-space: nowrap;
    overflow: visible; /* 允许左侧覆盖显示 */
  }

  .op-btn {
    /* 强制为正方形按钮 */
    --el-button-padding-horizontal: 0;
    min-width: 34px !important;
    width: 34px !important;
    height: 34px !important;
    aspect-ratio: 1 / 1;
    line-height: 34px !important;
    padding: 0 !important;
    border: none !important;
    box-sizing: border-box;
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
    border-radius: 6px !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 34px;
    overflow: hidden;
  }

  /* 规范按钮内部图标布局，避免被默认样式撑宽 */
  .op-btn > i,
  .op-btn > span {
    margin: 0 !important;
    padding: 0 !important;
    line-height: 1 !important;
  }

  .op-btn > i {
    display: inline-block !important;
    width: 16px !important;
    height: 16px !important;
    line-height: 16px !important;
    font-size: 16px !important;
  }

  /* 与服务商页一致：取消 hover/active/focus 的变色/阴影效果 */
  .op-btn:hover,
  .op-btn:focus,
  .op-btn:active {
    background: inherit !important;
    color: inherit !important;
    border: none !important;
    box-shadow: none !important;
    filter: none !important;
  }

  /* 禁用态（转圈中）保持与常态一致，不灰显不变色 */
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

  .op-view {
    color: var(--el-color-info);
    background: var(--el-color-info-light-9);
  }

  .op-test {
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
    /* 固定 Element Plus 按钮变量，避免 hover/disabled 变色 */
    --el-button-hover-bg-color: var(--el-color-warning-light-9);
    --el-button-hover-text-color: var(--el-color-warning);
    --el-button-disabled-bg-color: var(--el-color-warning-light-9);
    --el-button-disabled-text-color: var(--el-color-warning);
  }
  /* 测试按钮在 hover/focus/active 不变色 */
  .op-test:hover,
  .op-test:focus,
  .op-test:active {
    color: var(--el-color-warning) !important;
    background: var(--el-color-warning-light-9) !important;
  }
  /* 运行中/禁用时保持同色 */
  .op-test.is-running,
  .op-test.is-running:hover,
  .op-test.is-running:active,
  .op-test:disabled,
  .op-test[disabled],
  .op-test.is-disabled {
    color: var(--el-color-warning) !important;
    background: var(--el-color-warning-light-9) !important;
  }
  /* 禁用 + hover 组合也保持不变色 */
  .op-test:disabled:hover,
  .op-test[disabled]:hover,
  .op-test.is-disabled:hover {
    color: var(--el-color-warning) !important;
    background: var(--el-color-warning-light-9) !important;
  }

  .op-test.is-success {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
    --el-button-hover-bg-color: var(--el-color-success-light-9);
    --el-button-hover-text-color: var(--el-color-success);
    --el-button-disabled-bg-color: var(--el-color-success-light-9);
    --el-button-disabled-text-color: var(--el-color-success);
  }
  .op-test.is-success:hover,
  .op-test.is-success:focus,
  .op-test.is-success:active {
    color: var(--el-color-success) !important;
    background: var(--el-color-success-light-9) !important;
  }
  .op-test.is-success:disabled,
  .op-test.is-success[disabled],
  .op-test.is-success.is-disabled {
    color: var(--el-color-success) !important;
    background: var(--el-color-success-light-9) !important;
  }
  .op-test.is-success:disabled:hover,
  .op-test.is-success[disabled]:hover,
  .op-test.is-success.is-disabled:hover {
    color: var(--el-color-success) !important;
    background: var(--el-color-success-light-9) !important;
  }

  .op-test.is-fail {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
    --el-button-hover-bg-color: var(--el-color-danger-light-9);
    --el-button-hover-text-color: var(--el-color-danger);
    --el-button-disabled-bg-color: var(--el-color-danger-light-9);
    --el-button-disabled-text-color: var(--el-color-danger);
  }
  .op-test.is-fail:hover,
  .op-test.is-fail:focus,
  .op-test.is-fail:active {
    color: var(--el-color-danger) !important;
    background: var(--el-color-danger-light-9) !important;
  }
  .op-test.is-fail:disabled,
  .op-test.is-fail[disabled],
  .op-test.is-fail.is-disabled {
    color: var(--el-color-danger) !important;
    background: var(--el-color-danger-light-9) !important;
  }
  .op-test.is-fail:disabled:hover,
  .op-test.is-fail[disabled]:hover,
  .op-test.is-fail.is-disabled:hover {
    color: var(--el-color-danger) !important;
    background: var(--el-color-danger-light-9) !important;
  }

  /* 进一步提升优先级，覆盖 Element Plus 对禁用按钮的 hover 背景色 */
  :deep(.el-button.op-btn.is-disabled),
  :deep(.el-button.op-btn.is-disabled:hover),
  :deep(.el-button.op-btn.is-disabled:active) {
    background-color: inherit !important;
    color: inherit !important;
    box-shadow: none !important;
    filter: none !important;
  }
  :deep(.el-button.op-test.is-disabled),
  :deep(.el-button.op-test.is-disabled:hover),
  :deep(.el-button.op-test.is-disabled:active),
  :deep(.el-button.op-test.is-running),
  :deep(.el-button.op-test.is-running:hover),
  :deep(.el-button.op-test.is-running:active) {
    background-color: var(--el-color-warning-light-9) !important;
    color: var(--el-color-warning) !important;
  }

  /* 失败图标（X）强制红色显示，避免被按钮类型（如 primary）覆盖为白色 */
  .iconsys-zhifushibai {
    color: var(--el-color-danger) !important;
  }

  /* 耗时文本覆盖显示（仅成功时出现），位于第一个按钮左外侧，不影响操作区 */
  .latency-overlay {
    position: absolute;
    right: 100%; /* 挨住按钮组左边缘 */
    margin-right: 6px; /* 与第一个按钮预留间隔 */
    top: 50%;
    transform: translateY(-50%);
    z-index: 30; /* 置顶，确保不被表格容器层遮挡 */
    pointer-events: none; /* 不阻挡点击 */
    font-size: 12px;
    line-height: 1;
    white-space: nowrap; /* 文本不换行 */
    color: var(--el-color-success);
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.8);
  }

  /* 允许“贴图式”延迟文本跨出单元格与固定列区域显示 */
  :deep(.el-table__body .el-table__cell .cell) {
    overflow: visible !important;
  }
  :deep(.el-table__fixed-right) {
    overflow: visible !important;
  }
  :deep(.el-table__fixed-right .el-table__fixed-body-wrapper) {
    overflow: visible !important;
  }

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

  /* 虚线转圈 */
  .spinner-dash {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px dashed currentColor; /* 使用按钮文字颜色 */
    animation: art-rotate 1s linear infinite;
    display: inline-block;
    box-sizing: border-box;
  }

  .op-edit {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  .op-delete {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }

  .priority-view .clickable {
    cursor: pointer;
  }

  /* 通用可点样式（其它列也可复用） */
  .clickable {
    cursor: pointer;
  }

  /* 紧凑下拉样式，缩短高度与内边距，文本居中，减小箭头 */
  .compact-select :deep(.el-input__wrapper) {
    padding: 0 6px !important;
    height: 26px !important;
    min-height: 26px !important;
    border-radius: 6px !important;
  }
  .compact-select :deep(.el-input__inner) {
    text-align: center;
  }
  .compact-select :deep(.el-select__caret) {
    font-size: 12px;
  }
  .compact-select :deep(.el-select-dropdown__item) {
    padding: 4px 8px;
  }
</style>
