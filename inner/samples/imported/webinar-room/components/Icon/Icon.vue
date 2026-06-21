<script setup lang="ts">
import { computed } from 'vue'
import DotsVertical from './icons/DotsVertical.vue'
import DotsHorizontal from './icons/DotsHorizontal.vue'
import LinesHorizontal from './icons/LinesHorizontal.vue'
import Cross from './icons/Cross.vue'
import Edit from './icons/Edit.vue'
import Plus from './icons/Plus.vue'
import Minus from './icons/Minus.vue'
import Search from './icons/Search.vue'
import Trash from './icons/Trash.vue'
import AngelRight from './icons/AngelRight.vue'
import AngelLeft from './icons/AngelLeft.vue'
import AngelUp from './icons/AngelUp.vue'
import AngelDown from './icons/AngelDown.vue'
import Check from './icons/Check.vue'
import Gear from './icons/Gear.vue'
import ArrowsRotate from './icons/ArrowsRotate.vue'
import Lock from './icons/Lock.vue'
import Funnel from './icons/Funnel.vue'
import Clone from './icons/Clone.vue'
import ClonePlus from './icons/ClonePlus.vue'
import Play from './icons/Play.vue'
import Stop from './icons/Stop.vue'
import Telegram from './icons/Telegram.vue'
import Whatsapp from './icons/Whatsapp.vue'
import Viber from './icons/Viber.vue'
import User from './icons/User.vue'
import UserLock from './icons/UserLock.vue'
import CartShopping from './icons/CartShopping.vue'
import Save from './icons/Save.vue'

const icons = {
  'dots-vertical': DotsVertical,
  'dots-horizontal': DotsHorizontal,
  'lines-horizontal': LinesHorizontal,
  cross: Cross,
  edit: Edit,
  plus: Plus,
  minus: Minus,
  search: Search,
  trash: Trash,
  'angel-right': AngelRight,
  'angel-left': AngelLeft,
  'angel-up': AngelUp,
  'angel-down': AngelDown,
  check: Check,
  gear: Gear,
  'arrows-rotate': ArrowsRotate,
  lock: Lock,
  funnel: Funnel,
  clone: Clone,
  'clone-plus': ClonePlus,
  play: Play,
  stop: Stop,
  telegram: Telegram,
  whatsapp: Whatsapp,
  viber: Viber,
  user: User,
  'user-lock': UserLock,
  'cart-shopping': CartShopping,
  save: Save
}

export interface IconProps {
  name:
    | 'dots-vertical'
    | 'dots-horizontal'
    | 'lines-horizontal'
    | 'cross'
    | 'edit'
    | 'plus'
    | 'minus'
    | 'search'
    | 'trash'
    | 'angel-right'
    | 'angel-left'
    | 'angel-up'
    | 'angel-down'
    | 'check'
    | 'gear'
    | 'arrows-rotate'
    | 'lock'
    | 'funnel'
    | 'clone'
    | 'clone-plus'
    | 'play'
    | 'stop'
    | 'telegram'
    | 'whatsapp'
    | 'viber'
    | 'user'
    | 'user-lock'
    | 'cart-shopping'
    | 'save'
  size?: number
  fill?: string
  style?: string
  id?: string
  class?: any
}

const props = withDefaults(defineProps<IconProps>(), {
  size: 12,
  fill: 'currentColor'
})

const resultProps = computed(() => ({
  size: props.size,
  fill: props.fill,
  ...props
}))
</script>

<template>
  <component :is="icons[name]" v-bind="resultProps" />
</template>
