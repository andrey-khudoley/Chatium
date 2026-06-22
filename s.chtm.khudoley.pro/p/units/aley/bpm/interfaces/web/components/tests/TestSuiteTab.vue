<script setup lang="ts">
// Панель одной вкладки тестов (юнит / интеграция / HTTP). Разметка едина для всех
// трёх вкладок; данные и колбэки приходят из useTestSuites через родителя.
// CSS глобальный (классы .tp-* инжектятся на странице тестов).
import type {
  BlockSectionView,
  SuiteSectionTab,
  SingleRunGroup
} from '../../shared/testSuiteHelpers'

const props = defineProps<{
  tab: SuiteSectionTab
  heading: string
  headingIcon: string
  codeLabel: string
  blocksView: BlockSectionView[]
  loading: boolean
  runLabel: string
  groupBlocked: boolean
  isSuiteSectionExpanded: (tab: SuiteSectionTab, blockId: string, blockIndex: number) => boolean
  isSingleRunning: (group: SingleRunGroup, id: string) => boolean
}>()

defineEmits<{
  (e: 'run-suite'): void
  (e: 'run-single', id: string): void
  (e: 'toggle-section', blockId: string, blockIndex: number): void
}>()
</script>

<template>
  <div class="tp-tab-panel">
    <div class="tp-suite">
      <div class="tp-suite-hd">
        <h2><i class="tp-icon-hd" :class="props.headingIcon"></i> {{ props.heading }}</h2>
        <code class="tp-code">{{ props.codeLabel }}</code>
      </div>
      <div v-for="(section, sIdx) in props.blocksView" :key="section.block.id" class="tp-block">
        <button
          type="button"
          class="tp-block-hd tp-block-hd--toggle"
          :aria-expanded="props.isSuiteSectionExpanded(props.tab, section.block.id, sIdx)"
          @click="$emit('toggle-section', section.block.id, sIdx)"
        >
          <span class="tp-block-hd-title">
            <i
              class="tp-icon-block"
              :class="
                props.isSuiteSectionExpanded(props.tab, section.block.id, sIdx)
                  ? 'fas fa-folder-open'
                  : 'fas fa-folder'
              "
            ></i>
            {{ section.block.title }}
          </span>
          <span class="tp-block-info">{{ section.rollupLabel }}</span>
        </button>
        <div
          v-show="props.isSuiteSectionExpanded(props.tab, section.block.id, sIdx)"
          class="tp-block-body"
        >
          <p v-if="section.block.description" class="tp-block-desc">
            {{ section.block.description }}
          </p>
          <ul class="tp-tests" role="list">
            <li
              v-for="row in section.rows"
              :key="row.test.id"
              class="tp-test"
              :class="`tp-test--${row.visual.status}`"
            >
              <div class="tp-test-accent" :class="`tp-test-accent--${row.visual.status}`"></div>
              <div class="tp-test-content">
                <div class="tp-test-main">
                  <span class="tp-badge" :class="`tp-badge--${row.visual.status}`">{{
                    row.visual.badgeText
                  }}</span>
                  <span class="tp-test-name">{{ row.test.title }}</span>
                  <button
                    type="button"
                    class="tp-test-run"
                    :disabled="props.loading || props.groupBlocked"
                    @click="$emit('run-single', row.test.id)"
                  >
                    <i
                      v-if="props.isSingleRunning(props.tab, row.test.id)"
                      class="fas fa-circle-notch fa-spin"
                    ></i>
                    <i v-else class="fas fa-play"></i>
                  </button>
                </div>
                <code class="tp-test-id">{{ row.test.id }}</code>
                <p v-if="row.visual.error" class="tp-test-err">
                  <i class="fas fa-exclamation-circle"></i> {{ row.visual.error }}
                </p>
              </div>
            </li>
          </ul>
        </div>
      </div>
      <button
        type="button"
        class="tp-btn tp-suite-run"
        :disabled="props.loading || props.groupBlocked"
        @click="$emit('run-suite')"
      >
        <i v-if="props.loading" class="fas fa-circle-notch fa-spin"></i>
        <i v-else class="fas fa-play"></i>
        {{ props.loading ? 'Запуск...' : props.runLabel }}
      </button>
    </div>
  </div>
</template>
