<template>
  <div class="art-page-view">
    <!-- 搜索区域 -->
    <ArtSearchBar
      v-model="searchFormModel"
      :items="searchItems"
      :is-expand="false"
      :show-expand="true"
      :show-reset="true"
      :show-search="true"
      @search="handleSearch"
      @reset="handleReset"
    />

    <ElCard class="art-table-card" shadow="never">
      <template #header>
        <div class="table-header-wrapper">
          <h4>服务商管理</h4>
          <div class="table-info">
            <ElTag v-if="loading" type="warning">加载中...</ElTag>
            <ElTag v-else type="success">{{ providers.length }} 个服务商</ElTag>
          </div>
        </div>
      </template>

      <ArtTableHeader
        v-model:columns="columnChecks"
        @refresh="loadProviders"
        layout="refresh,size,fullscreen,columns,settings"
        fullClass="art-table-card"
      >
        <template #left>
          <ElButton type="primary" @click="handleAddProvider">
            <ElIcon><Plus /></ElIcon>
            新增服务商
          </ElButton>
        </template>
      </ArtTableHeader>

      <ArtTable :loading="loading" :data="providers" :columns="visibleColumns">
        <template #isActive="{ row }">
          <ElSwitch
            v-model="row.isActive"
            :loading="row.switching"
            @change="() => handleToggleStatus(row)"
          />
        </template>
        <template #createdAt="{ row }">
          {{ formatDate(row.createdAt) }}
        </template>
        <template #actions="{ row }">
          <div class="op-btns">
            <ElTooltip content="测试连接" placement="top">
              <ElButton
                class="op-btn op-test"
                :class="{
                  'is-running': row.testStatus === 'running',
                  'is-success': row.testStatus === 'success',
                  'is-fail': row.testStatus === 'fail'
                }"
                @click="handleTest(row)"
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
            <ElTooltip content="管理" placement="top">
              <ElButton class="op-btn op-manage" @click="handleManage(row)">
                <i class="iconfont-sys iconsys-shezhi2" />
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

    <!-- 新增/编辑服务商对话框 -->
    <ElDialog
      v-model="dialogVisible"
      :title="dialogMode === 'edit' ? '编辑服务商' : '新增服务商'"
      width="600px"
      :close-on-click-modal="false"
      :align-center="true"
    >
      <ElForm ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <ElFormItem label="服务商名称" prop="displayName">
          <ElInput v-model="formData.displayName" placeholder="请输入服务商名称" />
        </ElFormItem>
        <ElFormItem v-if="dialogMode === 'create'" label="服务商类型" prop="providerType">
          <ElSelect
            v-model="formData.providerType"
            placeholder="请选择服务商类型"
            @change="handleProviderTypeChange"
          >
            <ElOption label="OpenAI" value="openai" />
            <ElOption label="Gemini" value="gemini" />
            <ElOption label="Anthropic" value="anthropic" />
            <ElOption label="DeepSeek" value="deepseek" />
          </ElSelect>
          <div class="form-tip">
            选择服务商类型后，系统会按该类型自动填充 API 地址与认证方式（如 OpenAI 兼容格式）
          </div>
        </ElFormItem>
        <ElFormItem label="标识" prop="name">
          <ElInput
            v-model="formData.name"
            placeholder="请输入唯一标识，如 openai_main（小写英文/数字/下划线/短横线）"
          />
          <div class="form-tip">同一类型可配置多个服务商，但标识必须全局唯一</div>
        </ElFormItem>
        <ElFormItem label="API地址" prop="baseUrl">
          <ElInput
            v-model="formData.baseUrl"
            placeholder="请输入API地址，如：https://api.openai.com/v1"
          />
          <div class="form-tip" v-if="formData.providerType === 'openai'">
            OpenAI 兼容格式，可用于其他兼容 OpenAI API 的服务商
          </div>
        </ElFormItem>
        <ElFormItem label="API密钥" prop="apiKey">
          <ElInput
            v-model="formData.apiKey"
            type="password"
            placeholder="请输入API密钥"
            show-password
          />
          <ElCheckbox v-if="dialogMode === 'edit'" v-model="clearApiKey" style="margin-top: 8px">
            清空密钥
          </ElCheckbox>
          <div class="form-tip">留空表示不更改；勾选“清空密钥”将移除已保存密钥</div>
        </ElFormItem>
        <ElFormItem label="启用状态" prop="isActive">
          <ElSwitch v-model="formData.isActive" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="dialogVisible = false">取消</ElButton>
        <ElButton type="primary" @click="handleSubmit">确定</ElButton>
      </template>
    </ElDialog>

    <!-- 管理弹窗：自动拉取该服务商模型 + 顶部搜索 -->
    <ElDialog
      v-model="manageVisible"
      :title="manageProvider ? `管理 - ${manageProvider.displayName}` : '管理'"
      width="700px"
      :close-on-click-modal="false"
      :align-center="true"
    >
      <div style="display: flex; gap: 8px; margin-bottom: 12px">
        <ElInput v-model="manageSearch" placeholder="搜索模型 ID/名称" clearable />
        <ElButton
          :loading="manageLoading"
          @click="manageProvider && fetchManageModels(manageProvider)"
        >
          重新拉取
        </ElButton>
      </div>
      <ElTable :data="filteredManageModels" :loading="manageLoading" border>
        <ElTableColumn prop="id" label="模型ID" min-width="220" />
        <ElTableColumn prop="name" label="名称" min-width="160" />
        <ElTableColumn prop="type" label="类型" width="120" />
      </ElTable>
      <template #footer>
        <ElButton @click="manageVisible = false">关闭</ElButton>
      </template>
    </ElDialog>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, onMounted, onActivated, computed } from 'vue'
  import {
    ElCard,
    ElTag,
    ElButton,
    ElIcon,
    ElTooltip,
    ElDialog,
    ElForm,
    ElFormItem,
    ElInput,
    ElSelect,
    ElOption,
    ElSwitch,
    ElCheckbox,
    ElMessage,
    ElMessageBox,
    ElTable,
    ElTableColumn
  } from 'element-plus'
  import { Plus } from '@element-plus/icons-vue'
  import type { FormRules } from 'element-plus'
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import ArtTableHeader from '@/components/core/tables/art-table-header/index.vue'
  import ArtSearchBar from '@/components/core/forms/art-search-bar/index.vue'
  import type { ColumnOption } from '@/types/component'
  import {
    getAIProviders,
    getAIProviderById,
    createAIProvider,
    updateAIProvider,
    deleteAIProvider,
    fetchProviderModels,
    type AIProvider
  } from '@/api/ai-models'

  const loading = ref(false)
  const providers = ref<
    (AIProvider & {
      switching?: boolean
      testStatus?: 'idle' | 'running' | 'success' | 'fail'
    })[]
  >([])

  const columns = ref<ColumnOption[]>([
    { prop: 'displayName', label: '服务商名称', minWidth: 120 },
    { prop: 'name', label: '标识', width: 120 },
    { prop: 'baseUrl', label: 'API地址', minWidth: 200 },
    { prop: 'isActive', label: '状态', width: 90, useSlot: true },
    { prop: 'createdAt', label: '创建时间', minWidth: 160, useSlot: true },
    {
      prop: 'actions',
      label: '操作',
      width: 200,
      fixed: 'right',
      headerAlign: 'left',
      align: 'left',
      useSlot: true
    }
  ])

  // v-model 的包装器，避免对 const reactive 对象整体赋值
  const searchFormModel = computed<Record<string, any>>({
    get: () => searchFormState,
    set: (v) => Object.assign(searchFormState, v || {})
  })
  // 列显隐/排序配置（与模型列表页保持一致）
  const columnChecks = ref<ColumnOption[]>(columns.value.map((c) => ({ ...c, checked: true })))
  // 按列设置面板的顺序与勾选状态，生成实际渲染列
  const visibleColumns = computed<ColumnOption[]>(() => {
    const base = columns.value
    const byKey = (c: ColumnOption) => (c.prop as string) || (c.type as string)
    const baseMap = new Map(base.map((c) => [byKey(c), c]))
    return (columnChecks.value || [])
      .filter((c: any) => c && (c as any).checked !== false)
      .map((c: any) => baseMap.get(byKey(c)))
      .filter(Boolean) as ColumnOption[]
  })

  // 搜索表单（名称/状态）
  const searchFormState = reactive<Record<string, any>>({
    displayName: '',
    isActive: undefined as boolean | undefined
  })
  const searchItems = computed(() => [
    {
      key: 'displayName',
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

  const dialogVisible = ref(false)
  const dialogMode = ref<'create' | 'edit'>('create')
  const currentId = ref<number | null>(null)
  const clearApiKey = ref(false)
  const formRef = ref()
  const formData = reactive<any>({
    name: '',
    providerType: '',
    displayName: '',
    baseUrl: '',
    apiKey: '',
    isActive: true
  })

  // 会话级服务商密钥缓存 { [providerName]: realApiKey }
  const cacheStorageKey = 'ai-provider-apikey-cache'
  const cachedApiKeyMap = ref<Record<string, string>>({})
  const loadApiKeyCache = () => {
    try {
      const raw = sessionStorage.getItem(cacheStorageKey)
      cachedApiKeyMap.value = raw ? JSON.parse(raw) : {}
    } catch {
      cachedApiKeyMap.value = {}
    }
  }

  // 根据 providerName/id 获取可能的真实明文API Key（优先缓存，其次详情接口可见字段）
  const getRealApiKeyForProvider = async (row: AIProvider): Promise<string | undefined> => {
    const nameKey = row?.name ? String(row.name) : ''
    const cached = nameKey ? cachedApiKeyMap.value[nameKey] : ''
    if (cached && typeof cached === 'string') return cached
    try {
      const detail: any = await getAIProviderById(row.id as number)
      const candidates = [
        detail?.apiKeyDecrypted,
        detail?.apiKeyPlain,
        detail?.apiKey,
        detail?.apiKeyEncrypted
      ]
      const real = candidates.find((v) => typeof v === 'string' && v && !isMaskedKey(String(v)))
      return real as string | undefined
    } catch {
      return undefined
    }
  }

  // 测试连接：调用拉取模型接口作为可用性检测
  const handleTest = async (
    row: AIProvider & { testStatus?: 'idle' | 'running' | 'success' | 'fail' }
  ) => {
    row.testStatus = 'running'
    try {
      const apiKey = await getRealApiKeyForProvider(row)
      if (!apiKey) {
        throw new Error('未找到可用的 API Key，请在编辑中填写后再试')
      }
      await fetchProviderModels({ provider: String(row.name), apiKey })
      row.testStatus = 'success'
      ElMessage.success('测试成功')
    } catch (err: any) {
      row.testStatus = 'fail'
      const msg = err?.message || err?.data?.message || '测试失败'
      ElMessage.error(msg)
    } finally {
      // 保持测试结果，直到用户刷新或切换页面再回来时再复原（loadProviders 会重置为 idle）
    }
  }

  // 管理弹窗
  const manageVisible = ref(false)
  const manageProvider = ref<AIProvider | null>(null)
  const manageLoading = ref(false)
  const manageModels = ref<Array<{ id: string; name?: string; type?: string }>>([])
  const manageSearch = ref('')

  const fetchManageModels = async (row: AIProvider) => {
    manageLoading.value = true
    try {
      const apiKey = await getRealApiKeyForProvider(row)
      if (!apiKey) {
        throw new Error('未找到可用的 API Key，请在编辑中填写后再试')
      }
      const res: any = await fetchProviderModels({ provider: String(row.name), apiKey })
      const list = (res && (res.data || res.list)) || res || []
      const rawList = Array.isArray(list) ? list : []
      manageModels.value = rawList.map((m: any) => {
        if (m && typeof m === 'object' && (m.id || m.name)) {
          const id = m.id ?? m.name
          return { id: String(id), name: m.name ? String(m.name) : String(id), type: m.type }
        }
        const s = String(m)
        return { id: s, name: s }
      })
    } catch (err: any) {
      const msg = err?.message || err?.data?.message || '拉取模型列表失败'
      ElMessage.error(msg)
      manageModels.value = []
    } finally {
      manageLoading.value = false
    }
  }

  const filteredManageModels = computed(() => {
    const kw = (manageSearch.value || '').trim().toLowerCase()
    if (!kw) return manageModels.value
    return manageModels.value.filter((m) =>
      [m.id, m.name, m.type].some((v) =>
        String(v || '')
          .toLowerCase()
          .includes(kw)
      )
    )
  })

  const handleManage = async (row: AIProvider) => {
    manageProvider.value = row
    manageSearch.value = ''
    manageVisible.value = true
    await fetchManageModels(row)
  }
  const saveApiKeyCache = () => {
    try {
      sessionStorage.setItem(cacheStorageKey, JSON.stringify(cachedApiKeyMap.value || {}))
    } catch {
      /* ignore */
    }
  }

  // 记录表单打开时（编辑态）预填的密钥，用于判断是否被用户修改
  const prefilledApiKey = ref<string>('')

  // 判断是否为掩码密钥（如 ******** 或 含大量 * 或 •）
  const isMaskedKey = (v?: string) => {
    if (!v || typeof v !== 'string') return false
    const s = v.trim()
    if (!s) return false
    const masked = (s.match(/[＊*•]/g) || []).length
    const visible = s.replace(/[＊*•]/g, '').replace(/\s/g, '').length
    return masked >= 6 && visible <= 4
  }

  const formRules: FormRules = {
    displayName: [{ required: true, message: '请输入服务商名称', trigger: 'blur' }],
    providerType: [{ required: true, message: '请选择服务商类型', trigger: 'change' }],
    name: [
      { required: true, message: '请输入标识', trigger: 'blur' },
      {
        pattern: /^[a-z0-9_-]+$/,
        message: '标识仅能包含小写字母、数字、下划线和短横线',
        trigger: 'blur'
      }
    ],
    baseUrl: [
      { required: true, message: '请输入API地址', trigger: 'blur' },
      { type: 'url', message: '请输入有效的URL地址', trigger: 'blur' }
    ]
  }

  const handleProviderTypeChange = (value: string) => {
    switch (value) {
      case 'openai':
        formData.baseUrl = 'https://api.openai.com/v1'
        break
      case 'gemini':
        formData.baseUrl = 'https://generativelanguage.googleapis.com'
        break
      case 'anthropic':
        formData.baseUrl = 'https://api.anthropic.com'
        break
    }
  }

  const loadProviders = async (params?: Record<string, any>) => {
    loading.value = true
    try {
      const query: Record<string, any> = {
        page: 1,
        limit: 100,
        ...searchFormState,
        ...params
      }
      // 清理空参数
      Object.keys(query).forEach((k) => {
        const v = query[k]
        if (v === '' || v === undefined || v === null) delete query[k]
      })
      const res = await getAIProviders(query)
      let list = ((res as any)?.data || []) as any[]
      // 客户端回退过滤（后端若未实现筛选）
      try {
        const kw = String(searchFormState.displayName || '')
          .trim()
          .toLowerCase()
        const st = searchFormState.isActive
        if (kw || st !== undefined) {
          list = list.filter((p: any) => {
            const okName = kw
              ? String(p?.displayName || '')
                  .toLowerCase()
                  .includes(kw)
              : true
            const okStatus = st !== undefined ? Boolean(p?.isActive) === Boolean(st) : true
            return okName && okStatus
          })
        }
      } catch {
        /* ignore */
      }
      providers.value = list.map((p: any) => ({ ...p, switching: false, testStatus: 'idle' }))
    } finally {
      loading.value = false
    }
  }

  // 搜索/重置
  const handleSearch = () => {
    loadProviders()
  }
  const handleReset = () => {
    searchFormState.displayName = ''
    searchFormState.isActive = undefined
    loadProviders()
  }

  const handleAddProvider = () => {
    Object.assign(formData, {
      name: '',
      providerType: '',
      displayName: '',
      baseUrl: '',
      apiKey: '',
      isActive: true
    })
    dialogMode.value = 'create'
    currentId.value = null
    clearApiKey.value = false
    dialogVisible.value = true
  }

  const handleEdit = async (row: AIProvider) => {
    Object.assign(formData, {
      name: row.name,
      providerType: (row as any).providerType || '',
      displayName: row.displayName,
      baseUrl: row.baseUrl,
      apiKey: '',
      isActive: !!row.isActive
    })
    dialogMode.value = 'edit'
    currentId.value = row.id as number
    clearApiKey.value = false
    dialogVisible.value = true
    prefilledApiKey.value = ''

    // 先尝试从缓存或当前行取真实密钥
    const cachedFromSession = row?.name ? cachedApiKeyMap.value[row.name] : undefined
    const rowCandidates = [
      (row as any)?.apiKeyDecrypted,
      (row as any)?.apiKeyPlain,
      (row as any)?.apiKey,
      (row as any)?.apiKeyEncrypted
    ]
    let real =
      (typeof cachedFromSession === 'string' && cachedFromSession && !isMaskedKey(cachedFromSession)
        ? cachedFromSession
        : undefined) ||
      (rowCandidates.find((v) => typeof v === 'string' && v && !isMaskedKey(v)) as
        | string
        | undefined)
    if (!real) {
      try {
        const detail: any = await getAIProviderById(row.id as number)
        const detailCandidates = [
          detail?.apiKeyDecrypted,
          detail?.apiKeyPlain,
          detail?.apiKey,
          detail?.apiKeyEncrypted
        ]
        real = detailCandidates.find((v) => typeof v === 'string' && v && !isMaskedKey(v)) as
          | string
          | undefined
      } catch {
        // ignore
      }
    }
    if (real && typeof real === 'string') {
      formData.apiKey = real
      prefilledApiKey.value = real
      if (row.name) {
        cachedApiKeyMap.value[row.name] = real
        saveApiKeyCache()
      }
    } else {
      // 若无真实值则留空（显示“留空表示不更改”提示）
      formData.apiKey = ''
    }
  }

  const handleDelete = async (row: AIProvider) => {
    await ElMessageBox.confirm(`确定要删除服务商 “${row.displayName}” 吗？`, '提示', {
      type: 'warning'
    })
    await deleteAIProvider(row.id as number)
    ElMessage.success('删除成功')
    await loadProviders()
    // 广播全局事件，通知相关页面（如模型管理页）强制刷新服务商下拉
    try {
      window.dispatchEvent(new CustomEvent('ai-provider:changed'))
    } catch {
      /* ignore */
    }
  }

  const handleSubmit = async () => {
    await formRef.value?.validate()
    if (dialogMode.value === 'create') {
      await createAIProvider({
        name: formData.name,
        providerType: formData.providerType,
        displayName: formData.displayName,
        baseUrl: formData.baseUrl,
        isActive: formData.isActive,
        authType: formData.providerType === 'openai' ? 'bearer' : 'header',
        ...(formData.apiKey ? { apiKeyEncrypted: formData.apiKey } : {})
      })
      // 创建成功后，若填写明文密钥，则写入会话缓存
      if (formData?.name && formData?.apiKey && !isMaskedKey(formData.apiKey)) {
        cachedApiKeyMap.value[String(formData.name)] = formData.apiKey
        saveApiKeyCache()
      }
    } else {
      const payload: any = {
        displayName: formData.displayName,
        baseUrl: formData.baseUrl,
        isActive: formData.isActive,
        authType: formData.providerType === 'openai' ? 'bearer' : 'header'
      }
      if (clearApiKey.value) {
        payload.apiKeyEncrypted = ''
      } else if (formData.apiKey && formData.apiKey !== prefilledApiKey.value) {
        payload.apiKeyEncrypted = formData.apiKey
      }
      await updateAIProvider(currentId.value as number, payload)
      // 同步更新/清理缓存
      if (formData?.name) {
        const key = String(formData.name)
        if (clearApiKey.value) {
          delete cachedApiKeyMap.value[key]
        } else if (payload.apiKeyEncrypted && !isMaskedKey(payload.apiKeyEncrypted)) {
          cachedApiKeyMap.value[key] = payload.apiKeyEncrypted
        }
        saveApiKeyCache()
      }
    }
    dialogVisible.value = false
    await loadProviders()
    // 广播全局事件，通知相关页面（如模型管理页）强制刷新服务商下拉
    try {
      window.dispatchEvent(new CustomEvent('ai-provider:changed'))
    } catch {
      /* ignore */
    }
  }

  // 状态切换（与模型列表一致：行内开关 + loading）
  const handleToggleStatus = async (row: AIProvider & { switching?: boolean }) => {
    const target = row.isActive
    row.switching = true
    try {
      await updateAIProvider(row.id as number, { isActive: target })
      row.isActive = target
      ElMessage.success(target ? '已启用' : '已禁用')
    } catch {
      // 回滚开关
      row.isActive = !target
      ElMessage.error('更新状态失败')
    } finally {
      row.switching = false
    }
  }

  onMounted(() => {
    loadApiKeyCache()
    loadProviders()
  })

  // 切换其他页面再返回时复原一次测试状态
  onActivated(() => {
    if (Array.isArray(providers.value)) {
      providers.value.forEach((row: any) => {
        row.testStatus = 'idle'
      })
    }
  })

  // 简单日期格式化（与模型页风格一致）
  const formatDate = (v?: string) => {
    if (!v) return '-'
    try {
      const d = new Date(v)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    } catch {
      return v
    }
  }
</script>

<style scoped>
  .form-tip {
    margin-top: 6px;
    font-size: 12px;
    color: var(--el-color-info);
  }
  /* 对齐模型列表的操作按钮样式 */
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
    /* 强制为正方形按钮 */
    --el-button-padding-horizontal: 0;
    min-width: 34px !important;
    width: 34px !important;
    height: 34px !important;
    padding: 0 !important;
    border: none !important;
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
  /* 与模型列表一致：取消 hover/active/focus 的变色/阴影效果 */
  .op-btn:hover,
  .op-btn:focus,
  .op-btn:active {
    background: inherit !important;
    color: inherit !important;
    border: none !important;
    box-shadow: none !important;
    filter: none !important;
  }
  /* 颜色对齐 */
  /* 右侧固定列允许内容溢出（覆盖） */
  :deep(.el-table__fixed-right .el-table__fixed-body-wrapper) {
    overflow: visible !important;
  }

  /* 虚线转圈动画 */
  @keyframes art-rotate {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
  .spinner-dash {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px dashed currentColor;
    animation: art-rotate 1s linear infinite;
    display: inline-block;
    box-sizing: border-box;
  }

  /* 颜色对齐 */
  .op-edit {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
  .op-delete {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }
  .op-test {
    color: var(--el-color-warning);
    background: var(--el-color-warning-light-9);
  }
  .op-test:hover,
  .op-test:focus,
  .op-test:active {
    color: var(--el-color-warning) !important;
    background: var(--el-color-warning-light-9) !important;
  }
  /* 运行中/禁用时保持警告色 */
  .op-test.is-running,
  .op-test.is-running:hover,
  .op-test.is-running:active,
  .op-test:disabled,
  .op-test[disabled],
  .op-test.is-disabled {
    color: var(--el-color-warning) !important;
    background: var(--el-color-warning-light-9) !important;
  }
  .op-test.is-success {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
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
  .op-test.is-fail {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
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
  .op-manage {
    color: var(--el-color-info);
    background: var(--el-color-info-light-9);
  }
  .op-manage:hover,
  .op-manage:focus,
  .op-manage:active {
    color: var(--el-color-info) !important;
    background: var(--el-color-info-light-9) !important;
  }
  .op-edit:hover,
  .op-edit:focus,
  .op-edit:active {
    color: var(--el-color-primary) !important;
    background: var(--el-color-primary-light-9) !important;
  }
  .op-delete:hover,
  .op-delete:focus,
  .op-delete:active {
    color: var(--el-color-danger) !important;
    background: var(--el-color-danger-light-9) !important;
  }
</style>
