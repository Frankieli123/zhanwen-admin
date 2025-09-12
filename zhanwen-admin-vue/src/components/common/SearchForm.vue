<template>
  <ElCard class="search-form-card" shadow="never">
    <ElForm ref="formRef" :model="formData" :inline="true" label-width="auto">
      <ElFormItem v-for="item in formItems" :key="item.name" :label="item.label" :prop="item.name">
        <!-- 输入框 -->
        <ElInput
          v-if="item.type === 'input'"
          v-model="formData[item.name]"
          :placeholder="item.placeholder"
          clearable
          style="width: 200px"
        />

        <!-- 选择器 -->
        <ElSelect
          v-else-if="item.type === 'select'"
          v-model="formData[item.name]"
          :placeholder="item.placeholder"
          clearable
          style="width: 200px"
        >
          <ElOption
            v-for="option in item.options"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>

        <!-- 日期范围选择器 -->
        <ElDatePicker
          v-else-if="item.type === 'dateRange'"
          v-model="formData[item.name]"
          type="daterange"
          :start-placeholder="item.placeholder?.[0] || '开始日期'"
          :end-placeholder="item.placeholder?.[1] || '结束日期'"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          style="width: 240px"
        />
      </ElFormItem>

      <ElFormItem>
        <ElButton type="primary" @click="handleSearch">
          <Icon name="search" />
          搜索
        </ElButton>
        <ElButton @click="handleReset">
          <Icon name="refresh" />
          重置
        </ElButton>
      </ElFormItem>
    </ElForm>
  </ElCard>
</template>

<script setup lang="ts">
  import { ref, reactive, watch } from 'vue'
  import Icon from './Icon.vue'

  interface FormItem {
    name: string
    label: string
    type: 'input' | 'select' | 'dateRange'
    placeholder?: string | string[]
    options?: Array<{ label: string; value: any }>
  }

  interface Props {
    formItems: FormItem[]
  }

  interface Emits {
    (e: 'search', values: Record<string, any>): void
    (e: 'reset'): void
  }

  const props = defineProps<Props>()
  const emit = defineEmits<Emits>()

  const formRef = ref()
  const formData = reactive<Record<string, any>>({})

  // 初始化表单数据
  props.formItems.forEach((item) => {
    formData[item.name] = undefined
  })

  const handleSearch = () => {
    emit('search', { ...formData })
  }

  const handleReset = () => {
    formRef.value?.resetFields()
    Object.keys(formData).forEach((key) => {
      formData[key] = undefined
    })
    emit('reset')
  }

  // 监听外部重置
  watch(
    () => props.formItems,
    () => {
      props.formItems.forEach((item) => {
        if (!(item.name in formData)) {
          formData[item.name] = undefined
        }
      })
    },
    { deep: true }
  )
</script>

<style scoped lang="scss">
  .search-form-card {
    margin-bottom: 16px;

    :deep(.el-card__body) {
      padding: 16px;
    }

    :deep(.el-form-item) {
      margin-bottom: 0;
    }
  }
</style>
