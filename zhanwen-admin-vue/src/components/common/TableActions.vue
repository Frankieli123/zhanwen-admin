<template>
  <ElSpace>
    <template v-for="action in visibleActions" :key="action.key">
      <ElButton
        v-if="!action.danger"
        :type="action.type || 'primary'"
        :size="action.size || 'small'"
        link
        @click="handleAction(action)"
      >
        <Icon v-if="action.icon" :name="action.icon" />
        {{ action.label }}
      </ElButton>

      <ElButton
        v-else
        type="danger"
        :size="action.size || 'small'"
        link
        @click="handleAction(action)"
      >
        <Icon v-if="action.icon" :name="action.icon" />
        {{ action.label }}
      </ElButton>
    </template>

    <!-- 更多操作下拉菜单 -->
    <ElDropdown v-if="moreActions.length > 0" @command="handleDropdownAction">
      <ElButton type="primary" size="small" link>
        更多
        <Icon name="arrow-down" />
      </ElButton>
      <template #dropdown>
        <ElDropdownMenu>
          <ElDropdownItem
            v-for="action in moreActions"
            :key="action.key"
            :command="action"
            :class="{ 'danger-item': action.danger }"
          >
            <Icon v-if="action.icon" :name="action.icon" />
            {{ action.label }}
          </ElDropdownItem>
        </ElDropdownMenu>
      </template>
    </ElDropdown>
  </ElSpace>
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import Icon from './Icon.vue'

  interface Action {
    key: string
    label: string
    icon?: string
    type?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
    size?: 'large' | 'default' | 'small'
    danger?: boolean
    data?: any
  }

  interface Props {
    actions: Action[]
    maxVisible?: number
  }

  interface Emits {
    (e: 'action', payload: { key: string; data?: any }): void
  }

  const props = withDefaults(defineProps<Props>(), {
    maxVisible: 3
  })

  const emit = defineEmits<Emits>()

  const visibleActions = computed(() => {
    return props.actions.slice(0, props.maxVisible)
  })

  const moreActions = computed(() => {
    return props.actions.slice(props.maxVisible)
  })

  const handleAction = (action: Action) => {
    emit('action', {
      key: action.key,
      data: action.data
    })
  }

  const handleDropdownAction = (action: Action) => {
    handleAction(action)
  }
</script>

<style scoped lang="scss">
  :deep(.danger-item) {
    color: #ff4d4f;

    &:hover {
      background-color: #fff2f0;
    }
  }
</style>
