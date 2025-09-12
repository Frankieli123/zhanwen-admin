<template>
  <div class="art-page-view">
    <!-- 搜索区域（与模型列表一致，使用 ArtSearchBar） -->
    <ArtSearchBar
      v-model="searchFormModel"
      :items="searchItems"
      :rules="searchRules"
      :is-expand="false"
      :show-expand="true"
      :show-reset="true"
      :show-search="true"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 表格区域（与模型列表一致：ElCard header + ArtTableHeader + ArtTable） -->
    <ElCard class="art-table-card" shadow="never">
      <template #header>
        <div class="table-header-wrapper">
          <h4>提示词列表</h4>
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
        <!-- 公共提示词为只读，移除新增/删除按钮 -->
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
        <!-- 模板预览 -->
        <template #templatePreview="{ row }">
          <div class="cell-vcenter">
            <span class="content-preview">{{ getUserPreview(row) }}</span>
          </div>
        </template>
        <!-- 活跃状态（开关可切换） -->
        <template #active="{ row }">
          <ElSwitch
            v-model="row.active"
            :loading="row.switching"
            @change="() => handleToggleActive(row)"
          />
        </template>
        <!-- 更新时间格式化显示 -->
        <template #updatedAt="{ row }">
          {{ formatDate(row.updatedAt) }}
        </template>
        <!-- 操作列（与模型列表一致：内封图标按钮） -->
        <template #operation="{ row }">
          <div class="op-btns">
            <ElTooltip content="查看详情" placement="top">
              <ElButton class="op-btn op-view" @click="handleView(row)">
                <i class="iconfont-sys iconsys-liulan" />
              </ElButton>
            </ElTooltip>
            <ElTooltip content="复制" placement="top">
              <ElButton class="op-btn op-copy" :disabled="!canEdit" @click="handleCopy(row)">
                <i class="iconfont-sys iconsys-fuzhi" />
              </ElButton>
            </ElTooltip>
            <ElTooltip content="编辑" placement="top">
              <ElButton class="op-btn op-edit" :disabled="!canEdit" @click="handleEdit(row)">
                <i class="iconfont-sys iconsys-bianji2" />
              </ElButton>
            </ElTooltip>
            <ElTooltip content="删除" placement="top">
              <ElButton class="op-btn op-delete" :disabled="!canEdit" @click="handleDelete(row)">
                <i class="iconfont-sys iconsys-lajitong" />
              </ElButton>
            </ElTooltip>
          </div>
        </template>
      </ArtTable>
    </ElCard>

    <!-- 详情抽屉：仅展示三段文本 -->
    <ElDrawer v-model="detailVisible" title="提示词详情" size="40%">
      <ElDescriptions v-loading="detailLoading" :column="1" border>
        <ElDescriptionsItem label="名称">{{ detailData?.name || '-' }}</ElDescriptionsItem>
        
        <ElDescriptionsItem label="版本">{{ detailData?.version || '-' }}</ElDescriptionsItem>
        <ElDescriptionsItem label="状态">
          <ElTag :type="detailData?.active ? 'success' : 'info'">
            {{ detailData?.active ? '启用' : '停用' }}
          </ElTag>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="创建时间">
          {{ formatDate(detailData?.createdAt) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="更新时间">
          {{ formatDate(detailData?.updatedAt) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="最后使用时间">
          {{ formatDate(detailData?.lastUsedAt) }}
        </ElDescriptionsItem>
        <ElDescriptionsItem label="System 文本">
          <div style="white-space: pre-wrap; line-height: 1.6">
            {{ detailData?.texts?.system_prompt || '-' }}
          </div>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="User 开头引导语">
          <div style="white-space: pre-wrap; line-height: 1.6">
            {{ detailData?.texts?.user_intro || '-' }}
          </div>
        </ElDescriptionsItem>
        <ElDescriptionsItem label="User 末尾说明块">
          <div style="white-space: pre-wrap; line-height: 1.6">
            {{ detailData?.texts?.user_guidelines || '-' }}
          </div>
        </ElDescriptionsItem>
      </ElDescriptions>
    </ElDrawer>

    <!-- 编辑抽屉（支持名称/版本与三段文本，需登录） -->
    <ElDrawer v-model="editVisible" :title="`编辑三段文本 - ${editForm.name || ''}`" size="50%">
      <ElForm v-loading="editLoading" label-width="110px" :model="editForm">
        <ElFormItem label="名称">
          <ElInput v-model="editForm.name" placeholder="请输入名称" />
        </ElFormItem>
        <ElFormItem label="版本">
          <ElInput v-model="editForm.version" placeholder="简化版本标识，如 1 或 2025-09-09" />
        </ElFormItem>
        <ElFormItem label="System 文本">
          <ElInput
            type="textarea"
            v-model="editForm.texts.system_prompt"
            :rows="5"
            placeholder="请输入 System 文本（≤1000）"
          />
        </ElFormItem>
        <ElFormItem label="开头引导语">
          <ElInput
            type="textarea"
            v-model="editForm.texts.user_intro"
            :rows="3"
            placeholder="请输入开头引导语（≤200）"
          />
        </ElFormItem>
        <ElFormItem label="末尾说明块">
          <ElInput
            type="textarea"
            v-model="editForm.texts.user_guidelines"
            :rows="8"
            placeholder="请输入末尾说明块（≤4000，换行会保留）"
          />
        </ElFormItem>
        <ElFormItem>
          <ElButton type="primary" :loading="editLoading" @click="submitEdit">保存</ElButton>
          <ElButton @click="editVisible = false">取消</ElButton>
        </ElFormItem>
      </ElForm>
    </ElDrawer>
  </div>
</template>

<script setup lang="ts">
  import { ref, reactive, computed, onMounted } from 'vue'

  // 定义组件名称
  defineOptions({
    name: 'PromptsList'
  })
  import {
    ElMessage,
    ElMessageBox,
    ElCard,
    ElTag,
    ElButton,
    ElSwitch,
    ElTooltip,
    ElDrawer,
    ElDescriptions,
    ElDescriptionsItem,
    ElForm,
    ElFormItem,
    ElInput
  } from 'element-plus'
  // 只读列表，无需新增/删除图标
  import ArtTable from '@/components/core/tables/art-table/index.vue'
  import ArtTableHeader from '@/components/core/tables/art-table-header/index.vue'
  import ArtSearchBar from '@/components/core/forms/art-search-bar/index.vue'
  import type { ColumnOption } from '@/types/component'
  import {
    getPromptTexts,
    getPromptTextsDetail,
    updatePromptTexts,
    duplicatePromptTexts,
    deletePromptTexts,
    type PromptTexts
  } from '@/api/prompt-texts'
  import { useUserStore } from '@/store/modules/user'
  // 表格与表单引用
  const tableRef = ref()

  // 表格数据
  const loading = ref(false)
  const tableData = ref<PromptTexts[]>([])
  const selectedRows = ref<PromptTexts[]>([])

  // 搜索（ArtSearchBar）
  const searchFormState = reactive<Record<string, any>>({
    name: '',
    active: undefined as boolean | undefined,
    version: ''
  })

  // v-model 包装器，避免对 const reactive 对象整体赋值
  const searchFormModel = computed<Record<string, any>>({
    get: () => searchFormState,
    set: (v) => Object.assign(searchFormState, v || {})
  })
  const searchItems = computed(() => [
    {
      key: 'name',
      label: '名称',
      type: 'input',
      props: { placeholder: '按名称精确查询', clearable: true }
    },
    {
      key: 'active',
      label: '状态',
      type: 'select',
      props: {
        placeholder: '请选择状态',
        clearable: true,
        options: [
          { label: '全部', value: undefined },
          { label: '启用', value: true },
          { label: '停用', value: false }
        ]
      }
    },
    {
      key: 'version',
      label: '版本',
      type: 'input',
      props: { placeholder: '版本号或时间戳', clearable: true }
    }
  ])
  const searchRules = {}

  // 分页（ArtTable 约定字段）
  const pagination = reactive({
    current: 1,
    size: 10,
    total: 0
  })

  // 表格列配置（ArtTable）
  const columns = ref<ColumnOption[]>([
    { type: 'selection', width: 55 },
    { prop: 'id', label: 'ID', width: 80 },
    { prop: 'name', label: '名称', minWidth: 180 },
    
    { prop: 'templatePreview', label: '模板预览', minWidth: 240, useSlot: true },
    { prop: 'version', label: '版本', minWidth: 160 },
    { prop: 'active', label: '状态', width: 90, useSlot: true },
    { prop: 'updatedAt', label: '更新时间', minWidth: 180, useSlot: true },
    { prop: 'operation', label: '操作', width: 200, fixed: 'right', useSlot: true }
  ])
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

  // 加载数据
  const loadData = async () => {
    loading.value = true
    try {
      const rawParams: Record<string, any> = {
        page: pagination.current,
        pageSize: pagination.size,
        ...searchFormState
      }
      // 清理空参数
      const params: Record<string, any> = { ...rawParams }
      Object.keys(params).forEach((k) => {
        const v = params[k]
        if (v === '' || v === undefined || v === null) delete params[k]
      })
      console.debug('[PromptTextsList] request /public/prompt-texts params =', params)
      const resList = await getPromptTexts(params)
      const list = Array.isArray(resList) ? resList : []
      console.debug('[PromptsList] response count =', list.length)
      tableData.value = list as any
      // 公共接口未返回分页统计，这里以本页数量作为 total 以维持 UI 稳定
      pagination.total = list.length
    } catch (err) {
      // 打印错误，便于快速定位 400 或其他状态
      console.error('[PromptsList] loadData error =', err)
      ElMessage.error('加载数据失败')
    } finally {
      loading.value = false
    }
  }

  // 搜索/重置/刷新
  const handleSearch = () => {
    pagination.current = 1
    loadData()
  }
  const handleReset = () => {
    searchFormState.name = ''
    
    searchFormState.active = undefined
    searchFormState.version = ''
    handleSearch()
  }
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

  // 选择（仅表内选择，无批量操作）
  const handleSelectionChange = (rows: PromptTexts[]) => {
    selectedRows.value = rows
  }
  // 只读列表，无新增/编辑/删除操作

  // 初始化
  onMounted(() => {
    loadData()
  })

  // 详情
  const detailVisible = ref(false)
  const detailData = ref<PromptTexts | null>(null)
  const detailLoading = ref(false)
  // 详情/编辑缓存：按ID缓存最近一次详情数据，默认2分钟有效
  const CACHE_TTL_MS = 2 * 60 * 1000
  const promptDetailCache = ref<Record<number, { data: PromptTexts; at: number }>>({})
  const getCachedDetail = (id: number): PromptTexts | null => {
    const item = promptDetailCache.value[id]
    if (!item) return null
    if (Date.now() - item.at < CACHE_TTL_MS) return item.data
    return null
  }
  const setCachedDetail = (id: number, data: PromptTexts) => {
    promptDetailCache.value[id] = { data, at: Date.now() }
  }
  const handleView = async (row: PromptTexts) => {
    // 先打开抽屉
    detailVisible.value = true
    // 命中缓存：直接展示缓存，避免再次加载
    const cached = getCachedDetail(row.id)
    if (cached) {
      detailData.value = cached
      // 若缓存已过期（此处不再判断TTL，因为 getCachedDetail 已严格校验）则考虑静默刷新
      // 静默刷新：不展示 loading，后台拉取最新数据并更新展示
      ;(async () => {
        try {
          const detail = await getPromptTextsDetail(row.id)
          detailData.value = detail
          setCachedDetail(row.id, detail)
        } catch {
          /* ignore background refresh error */
        }
      })()
      return
    }
    // 无缓存：先用行内数据占位 + 显示加载态，再请求
    detailLoading.value = true
    detailData.value = row
    try {
      const detail = await getPromptTextsDetail(row.id)
      detailData.value = detail
      setCachedDetail(row.id, detail)
    } catch {
      detailData.value = row
    } finally {
      detailLoading.value = false
    }
  }

  // 编辑（需登录）
  const userStore = useUserStore()
  const canEdit = computed(() => !!userStore.accessToken)
  const editVisible = ref(false)
  const editLoading = ref(false)
  const editForm = reactive<PromptTexts>({
    id: 0,
    name: '',
    version: '',
    
    active: true,
    texts: { system_prompt: '', user_intro: '', user_guidelines: '' },
    createdAt: '',
    lastUsedAt: '',
    updatedAt: ''
  })
  const handleEdit = async (row: PromptTexts) => {
    // 打开抽屉
    editVisible.value = true
    // 命中缓存则直接使用缓存，避免网络等待
    const cached = getCachedDetail(row.id)
    if (cached) {
      Object.assign(editForm, cached)
      editLoading.value = false
      return
    }
    // 无缓存：用行内数据占位并显示加载态
    editLoading.value = true
    Object.assign(editForm, {
      id: row.id,
      name: row.name,
      version: row.version,
      active: !!row.active,
      texts: {
        system_prompt: row?.texts?.system_prompt || '',
        user_intro: row?.texts?.user_intro || '',
        user_guidelines: row?.texts?.user_guidelines || ''
      },
      createdAt: row?.createdAt || '',
      lastUsedAt: row?.lastUsedAt || '',
      updatedAt: row?.updatedAt || ''
    })
    try {
      const detail = await getPromptTextsDetail(row.id)
      Object.assign(editForm, detail)
      setCachedDetail(row.id, detail)
    } catch (e) {
      console.error('[PromptTexts] load edit detail error:', e)
      ElMessage.error('加载文本详情失败，请检查权限或网络')
    } finally {
      editLoading.value = false
    }
  }
  const submitEdit = async () => {
    try {
      editLoading.value = true
      await updatePromptTexts(editForm.id, { name: editForm.name, version: editForm.version, texts: { ...editForm.texts } })
      ElMessage.success('保存成功')
      // 保存后刷新缓存
      try {
        const latest: PromptTexts = JSON.parse(JSON.stringify(editForm))
        setCachedDetail(editForm.id, latest)
      } catch {
        /* ignore cache update error */
      }
      editVisible.value = false
      loadData()
    } catch (e) {
      console.error('[PromptTexts] update error:', e)
      ElMessage.error('保存失败')
    } finally {
      editLoading.value = false
    }
  }

  // 复制
  const handleCopy = async (row: PromptTexts) => {
    if (!canEdit.value) {
      ElMessage.warning('请先登录再执行此操作')
      return
    }
    try {
      await ElMessageBox.confirm(
        `确定要复制 “${row.name} / v${row.version}” 吗？`,
        '复制确认',
        {
          confirmButtonText: '复制',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      editLoading.value = true
      await duplicatePromptTexts(row.id)
      ElMessage.success('复制成功')
      loadData()
    } catch (e) {
      if (e !== 'cancel') {
        console.error('[PromptTexts] duplicate error:', e)
        ElMessage.error('复制失败')
      }
    } finally {
      editLoading.value = false
    }
  }

  // 删除
  const handleDelete = async (row: PromptTexts) => {
    if (!canEdit.value) {
      ElMessage.warning('请先登录再执行此操作')
      return
    }
    try {
      await ElMessageBox.confirm(
        `确定要删除 “${row.name} / v${row.version}” 吗？`,
        '删除确认',
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
      await deletePromptTexts(row.id)
      ElMessage.success('删除成功')
      loadData()
    } catch (e: any) {
      if (e !== 'cancel') {
        console.error('[PromptTexts] delete error:', e)
        ElMessage.error('删除失败')
      }
    }
  }

  // 启用/禁用切换（开关变化触发）
  const handleToggleActive = async (row: PromptTexts & { switching?: boolean }) => {
    // 保险校验：未登录时不允许切换，并回退 UI
    if (!canEdit.value) {
      row.active = !row.active
      ElMessage.warning('请先登录再执行此操作')
      return
    }
    const newVal = !!row.active
    const prevVal = !newVal
    row.switching = true
    try {
      await updatePromptTexts(row.id, { isActive: newVal })
      ElMessage.success(newVal ? '已启用' : '已停用')
    } catch (e) {
      row.active = prevVal
      ElMessage.error('更新状态失败')
    } finally {
      row.switching = false
    }
  }

  // 工具：从 messages 中取 system/user
  const getUserPreview = (cfg?: PromptTexts | null) => {
    const intro = cfg?.texts?.user_intro || ''
    const oneLine = String(intro).replace(/\s+/g, ' ').trim()
    return oneLine.length > 100 ? `${oneLine.slice(0, 100)}...` : oneLine
  }

  // 日期格式化（与服务商管理一致：YYYY-MM-DD HH:mm:ss）
  const formatDate = (date?: string) => {
    if (!date) return '-'
    try {
      const d = new Date(date)
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    } catch {
      return '-'
    }
  }
</script>

<style scoped lang="scss">

  /* 表头与标题样式走全局 app.scss 统一配置 */
  .cell-vcenter {
    display: flex;
    align-items: center;
    height: 100%;
    min-height: 34px; /* 与行高一致，避免看起来靠上 */
  }
  .content-preview {
    display: inline-block;
    max-width: 400px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 操作列按钮（与模型列表页统一风格） */
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
  /* 取消 hover/active/focus 的变色/阴影效果，视觉保持稳定 */
  .op-btn:hover,
  .op-btn:focus,
  .op-btn:active {
    background: transparent !important;
    color: inherit !important; /* 由具体 op-* 决定颜色 */
    border: none !important;
    box-shadow: none !important;
    filter: none !important;
  }
  /* 禁用态与常态一致 */
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

  /* 不同操作颜色 */
  .op-view {
    color: var(--el-color-info);
    background: var(--el-color-info-light-9);
  }
  .op-view:hover,
  .op-view:focus,
  .op-view:active {
    color: var(--el-color-info) !important;
    background: var(--el-color-info-light-9) !important;
  }
  .op-edit {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
  .op-edit:hover,
  .op-edit:focus,
  .op-edit:active {
    color: var(--el-color-primary) !important;
    background: var(--el-color-primary-light-9) !important;
  }
  .op-copy {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
  }
  .op-copy:hover,
  .op-copy:focus,
  .op-copy:active {
    color: var(--el-color-success) !important;
    background: var(--el-color-success-light-9) !important;
  }
  .op-delete {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }
  .op-delete:hover,
  .op-delete:focus,
  .op-delete:active {
    color: var(--el-color-danger) !important;
    background: var(--el-color-danger-light-9) !important;
  }
</style>
