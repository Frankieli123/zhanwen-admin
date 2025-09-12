<template>
  <component :is="iconComponent" v-bind="$attrs" />
</template>

<script setup lang="ts">
  import { computed } from 'vue'
  import * as ElementPlusIcons from '@element-plus/icons-vue'

  interface Props {
    name: string
  }

  const props = defineProps<Props>()

  const iconComponent = computed(() => {
    // 将kebab-case转换为PascalCase
    const pascalName = props.name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')

    return (
      ElementPlusIcons[pascalName as keyof typeof ElementPlusIcons] ||
      ElementPlusIcons.QuestionFilled
    )
  })
</script>
