<template>
  <div class="toggle" :class="{ on: modelValue }" @click="$emit('update:modelValue', !modelValue)">
    <div class="toggle-knob"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ (e: 'update:modelValue', v: boolean): void }>()
</script>

<style scoped>
.toggle {
  width: 36px;
  height: 20px;
  border-radius: 10px;
  background: var(--surface-2);
  border: 1px solid var(--line-2);
  position: relative;
  cursor: pointer;
  transition:
    background 0.16s,
    border-color 0.16s;
  flex: none;
}
.toggle.on {
  background: var(--accent);
  border-color: var(--accent);
}
.toggle-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--fg3);
  transition:
    left 0.16s,
    background 0.16s;
}
.toggle.on .toggle-knob {
  left: 18px;
  background: var(--accent-fg);
}
</style>
