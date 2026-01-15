<template>
  <div class="console">
    <CardList />

    <ElRow :gutter="20">
      <ElCol :xs="24" :md="12" :lg="12">
        <TopEndpoints />
      </ElCol>
      <ElCol :xs="24" :md="12" :lg="12">
        <RecentErrors />
      </ElCol>
    </ElRow>
  </div>
</template>

<script setup lang="ts">
  import CardList from './widget/CardList.vue'
  import TopEndpoints from './widget/TopEndpoints.vue'
  import RecentErrors from './widget/RecentErrors.vue'
  import { useCommon } from '@/composables/useCommon'

  defineOptions({ name: 'Console' })

  useCommon().scrollToTop()
</script>

<style lang="scss" scoped>
  @use './style';
</style>
