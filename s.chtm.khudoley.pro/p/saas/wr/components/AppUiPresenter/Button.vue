<script setup lang="ts">
import { appUiStyleToCss } from './styles/styles'
import { AppUiButton } from './types'
import { processActions } from './actions/processActions'
import { useNavigatorContext } from './NavigatorContext'

interface ButtonProps {
  block: AppUiButton
}

const props = defineProps<ButtonProps>()
const navigator = useNavigatorContext()

async function clickHandler() {
  await processActions(props.block.onClick, navigator)
}
</script>

<template>
  <div class="AppUiButtonContainer" :style="appUiStyleToCss(block.containerStyle)">
    <button
      type="button"
      class="AppUiButton"
      :style="appUiStyleToCss(block.style)"
      :disabled="block.disabled"
      @click="clickHandler"
    >
      {{ block.title }}
    </button>
  </div>
</template>

<style scoped>
.AppUiButtonContainer {
  padding-left: 10px;
  padding-right: 10px;
  margin-bottom: 20px;
}

.AppUiButton {
  cursor: pointer;
  font-size: 15px;
  padding: 8px;
  outline: none;
  border-radius: 5px;
  width: 100%;
  background-color: #0379fe;
  border: 1px solid #0379fe;
  color: #fff;
}

.AppUiButton:disabled {
  cursor: default;
  background-color: #ededed;
  border: 1px solid #dddddd;
  color: dimgrey;
}
</style>
