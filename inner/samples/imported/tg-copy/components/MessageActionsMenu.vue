<template>
  <!-- Мобильное меню действий с сообщением (снизу экрана как в Telegram) -->
  <div v-if="show" class="mobile-actions-sheet" @click.self="close">
    <div class="mobile-actions-content">
      <!-- Заголовок с превью сообщения -->
      <div class="mobile-actions-header">
        <div class="mobile-message-preview">
          <div class="preview-author">{{ messageAuthor }}</div>
          <div class="preview-text">{{ messagePreview }}</div>
        </div>
      </div>

      <!-- Быстрые реакции (без пикера) -->
      <div class="mobile-quick-reactions">
        <button
          v-for="emoji in quickReactions"
          :key="emoji"
          class="mobile-reaction-btn"
          :class="{ active: hasUserReacted(emoji) }"
          @click="toggleReaction(emoji)"
        >
          {{ emoji }}
        </button>
        <button class="mobile-reaction-btn more" @click="showEmojiPicker = true">
          <i class="fas fa-plus"></i>
        </button>
      </div>

      <!-- Список действий -->
      <div v-if="!showEmojiPicker" class="mobile-actions-list">
        <button @click="reply" class="mobile-action-item">
          <i class="fas fa-reply"></i>
          <span>Ответить</span>
        </button>
        <button @click="select" class="mobile-action-item">
          <i class="fas fa-check-square"></i>
          <span>Выбрать</span>
        </button>
        <button @click="forward" class="mobile-action-item">
          <i class="fas fa-share"></i>
          <span>Переслать</span>
        </button>
        <button v-if="message?.text" @click="copyText" class="mobile-action-item">
          <i class="fas fa-copy"></i>
          <span>Копировать текст</span>
        </button>
        <button v-if="canPin" @click="pin" class="mobile-action-item">
          <i class="fas fa-thumbtack"></i>
          <span>Закрепить</span>
        </button>
        <button v-if="canEdit" @click="edit" class="mobile-action-item">
          <i class="fas fa-pen"></i>
          <span>Редактировать</span>
        </button>
        <button v-if="canDelete" @click="deleteMsg" class="mobile-action-item danger">
          <i class="fas fa-trash"></i>
          <span>Удалить</span>
        </button>
      </div>

      <!-- Пикер эмодзи (занимает всё пространство) -->
      <div v-else class="mobile-emoji-picker">
        <div class="mobile-emoji-header">
          <button @click="showEmojiPicker = false" class="btn-back">
            <i class="fas fa-arrow-left"></i>
          </button>
          <span>Выберите реакцию</span>
        </div>
        <div class="mobile-emoji-categories">
          <button
            v-for="cat in emojiCategories"
            :key="cat.id"
            :class="['mobile-emoji-cat-btn', { active: emojiCategory === cat.id }]"
            @click="emojiCategory = cat.id"
          >
            {{ cat.icon }}
          </button>
        </div>
        <div class="mobile-emoji-grid">
          <button
            v-for="emoji in currentEmojis"
            :key="emoji"
            class="mobile-emoji-btn"
            @click="selectEmoji(emoji)"
          >
            {{ emoji }}
          </button>
        </div>
      </div>

      <!-- Кнопка закрыть -->
      <button v-if="!showEmojiPicker" @click="close" class="mobile-action-close">
        Отмена
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  show: Boolean,
  message: Object,
  currentUserId: String,
  canManage: Boolean,
  isChannel: Boolean,
})

const emit = defineEmits(['close', 'reply', 'forward', 'pin', 'edit', 'delete', 'toggle-reaction', 'copy-text', 'select'])

const showEmojiPicker = ref(false)
const emojiCategory = ref('recent')

const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '🎉']

const emojiCategories = [
  { id: 'recent', name: 'Недавние', icon: '🕐' },
  { id: 'popular', name: 'Популярные', icon: '🔥' },
  { id: 'smileys', name: 'Смайлики', icon: '😀' },
  { id: 'hearts', name: 'Сердечки', icon: '❤️' },
  { id: 'gestures', name: 'Жесты', icon: '👍' },
  { id: 'animals', name: 'Животные', icon: '🐱' },
  { id: 'food', name: 'Еда', icon: '🍎' },
]

const emojisByCategory = {
  recent: ['👍', '❤️', '😂', '😮', '😢', '🎉', '💩', '👏', '🔥', '🤔', '👎', '😡', '🥳', '😍', '🤣', '🙏', '✨', '💯', '👌', '💔', '🫶', '😭', '😤', '🤯', '🥺', '👀', '💅', '🙈', '🤷', '🥰', '😎'],
  popular: ['👍', '❤️', '😂', '😮', '😢', '🎉', '💩', '👏', '🔥', '🤔', '👎', '😡', '🥳', '😍', '🤣', '🙏', '✨', '💯', '👌', '🕊️', '🫡', '🫶', '❤️‍🔥', '💔', '♥️', '💙', '💚', '💛', '🖤', '🤍', '🤎', '😭', '🥺', '😤', '🤯', '🥰', '😎', '🤩', '🥵', '🥶', '🤠', '🤡', '👀', '🙈', '🙉', '🙊', '💅', '🤷', '🤦', '🙋', '🙌', '🤲', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👅', '👄', '💋', '🩸', '👶', '👧', '🧒', '👦', '👩', '🧑', '👨', '👩‍🦱', '🧑‍🦱', '👨‍🦱', '👩‍🦰', '🧑‍🦰', '👨‍🦰', '👱‍♀️', '👱', '👱‍♂️', '👩‍🦳', '🧑‍🦳', '👨‍🦳', '👩‍🦲', '🧑‍🦲', '👨‍🦲', '🧔‍♀️', '🧔', '🧔‍♂️', '👵', '🧓', '👴'],
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '🥲', '☺️', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '☺️', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'],
  hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈️', '♉️', '♊️', '♋️', '♌️', '♍️', '♎️', '♏️', '♐️', '♑️', '♒️', '♓️', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚️', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕️', '🛑', '⛔️', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗️', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯️', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿️', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🛗'],
  gestures: ['👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🫱', '🫲', '🫳', '🫴', '🫷', '🫸', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸', '👶', '🧒', '👦', '👧', '🧑', '👱', '👨', '🧔', '🧔‍♂️', '🧔‍♀️', '👨‍🦰', '👨‍🦱', '👨‍🦲', '👨‍🦳', '👩', '👩‍🦰', '🧑‍🦰', '👩‍🦱', '🧑‍🦱', '👩‍🦲', '🧑‍🦲', '👩‍🦳', '🧑‍🦳', '👱‍♀️', '👱‍♂️', '🧓', '👴', '👵', '🙍', '🙍‍♂️', '🙍‍♀️', '🙎', '🙎‍♂️', '🙎‍♀️', '🙅', '🙅‍♂️', '🙅‍♀️', '🙆', '🙆‍♂️', '🙆‍♀️', '💁', '💁‍♂️', '💁‍♀️', '🙋', '🙋‍♂️', '🙋‍♀️', '🧏', '🧏‍♂️', '🧏‍♀️', '🙇', '🙇‍♂️', '🙇‍♀️', '🤦', '🤦‍♂️', '🤦‍♀️', '🤷', '🤷‍♂️', '🤷‍♀️', '🧑‍⚕️', '👨‍⚕️', '👩‍⚕️', '🧑‍🎓', '👨‍🎓', '👩‍🎓', '🧑‍🏫', '👨‍🏫', '👩‍🏫', '🧑‍⚖️', '👨‍⚖️', '👩‍⚖️', '🧑‍🌾', '👨‍🌾', '👩‍🌾', '🧑‍🍳', '👨‍🍳', '👩‍🍳', '🧑‍🔧', '👨‍🔧', '👩‍🔧', '🧑‍🏭', '👨‍🏭', '👩‍🏭', '🧑‍💼', '👨‍💼', '👩‍💼', '🧑‍🔬', '👨‍🔬', '👩‍🔬', '🧑‍💻', '👨‍💻', '👩‍💻', '🧑‍🎤', '👨‍🎤', '👩‍🎤', '🧑‍🎨', '👨‍🎨', '👩‍🎨', '🧑‍✈️', '👨‍✈️', '👩‍✈️', '🧑‍🚀', '👨‍🚀', '👩‍🚀', '🧑‍🚒', '👨‍🚒', '👩‍🚒', '👮', '👮‍♂️', '👮‍♀️', '🕵️', '🕵️‍♂️', '🕵️‍♀️', '💂', '💂‍♂️', '💂‍♀️', '🥷', '👷', '👷‍♂️', '👷‍♀️', '🫅', '🤴', '👸', '👳', '👳‍♂️', '👳‍♀️', '👲', '🧕', '🤵', '🤵‍♂️', '🤵‍♀️', '👰', '👰‍♂️', '👰‍♀️', '🤰', '🫄', '🫃', '🤱', '👩‍🍼', '👨‍🍼', '🧑‍🍼', '👼', '🎅', '🤶', '🧑‍🎄', '🦸', '🦸‍♂️', '🦸‍♀️', '🦹', '🦹‍♂️', '🦹‍♀️', '🧙', '🧙‍♂️', '🧙‍♀️', '🧚', '🧚‍♂️', '🧚‍♀️', '🧛', '🧛‍♂️', '🧛‍♀️', '🧜', '🧜‍♂️', '🧜‍♀️', '🧝', '🧝‍♂️', '🧝‍♀️', '🧞', '🧞‍♂️', '🧞‍♀️', '🧟', '🧟‍♂️', '🧟‍♀️', '🧌', '💆', '💆‍♂️', '💆‍♀️', '💇', '💇‍♂️', '💇‍♀️', '🚶', '🚶‍♂️', '🚶‍♀️', '🧍', '🧍‍♂️', '🧍‍♀️', '🧎', '🧎‍♂️', '🧎‍♀️', '🧑‍🦯', '👨‍🦯', '👩‍🦯', '🧑‍🦼', '👨‍🦼', '👩‍🦼', '🧑‍🦽', '👨‍🦽', '👩‍🦽', '🏃', '🏃‍♂️', '🏃‍♀️', '💃', '🕺', '🕴️', '👯', '👯‍♂️', '👯‍♀️', '🧖', '🧖‍♂️', '🧖‍♀️', '🧗', '🧗‍♂️', '🧗‍♀️', '🤺', '🏇', '⛷️', '🏂', '🏌️', '🏌️‍♂️', '🏌️‍♀️', '🏄', '🏄‍♂️', '🏄‍♀️', '🚣', '🚣‍♂️', '🚣‍♀️', '🏊', '🏊‍♂️', '🏊‍♀️', '⛹️', '⛹️‍♂️', '⛹️‍♀️', '🏋️', '🏋️‍♂️', '🏋️‍♀️', '🚴', '🚴‍♂️', '🚴‍♀️', '🚵', '🚵‍♂️', '🚵‍♀️', '🤸', '🤸‍♂️', '🤸‍♀️', '🤼', '🤼‍♂️', '🤼‍♀️', '🤽', '🤽‍♂️', '🤽‍♀️', '🤾', '🤾‍♂️', '🤾‍♀️', '🤹', '🤹‍♂️', '🤹‍♀️', '🧘', '🧘‍♂️', '🧘‍♀️', '🛀', '🛌', '🧑‍🤝‍🧑', '👭', '👫', '👬', '💏', '👩‍❤️‍💋‍👨', '👨‍❤️‍💋‍👨', '👩‍❤️‍💋‍👩', '💑', '👩‍❤️‍👨', '👨‍❤️‍👨', '👩‍❤️‍👩', '👪', '👨‍👩‍👦', '👨‍👩‍👧', '👨‍👩‍👧‍👦', '👨‍👩‍👦‍👦', '👨‍👩‍👧‍👧', '👨‍👨‍👦', '👨‍👨‍👧', '👨‍👨‍👧‍👦', '👨‍👨‍👦‍👦', '👨‍👨‍👧‍👧', '👩‍👩‍👦', '👩‍👩‍👧', '👩‍👩‍👧‍👦', '👩‍👩‍👦‍👦', '👩‍👩‍👧‍👧', '👨‍👦', '👨‍👧', '👨‍👧‍👦', '👨‍👦‍👦', '👨‍👧‍👧', '👩‍👦', '👩‍👧', '👩‍👧‍👦', '👩‍👦‍👦', '👩‍👧‍👧', '🗣️', '👤', '👥', '🫂', '👣'],
  animals: ['🐵', '🐒', '🦍', '🦧', '🐶', '🐕', '🦮', '🐕‍🦺', '🐩', '🐺', '🦊', '🦝', '🐱', '🐈', '🐈‍⬛', '🦁', '🐯', '🐅', '🐆', '🐴', '🐎', '🦄', '🦓', '🦌', '🦬', '🐮', '🐂', '🐃', '🐄', '🐷', '🐖', '🐗', '🐽', '🐏', '🐑', '🐐', '🐪', '🐫', '🦙', '🦒', '🐘', '🦣', '🦏', '🦛', '🐭', '🐁', '🐀', '🐹', '🐰', '🐇', '🐿️', '🦫', '🦔', '🦇', '🐻', '🐻‍❄️', '🐨', '🐼', '🦥', '🦦', '🦨', '🦘', '🦡', '🐾', '🦃', '🐔', '🐓', '🐣', '🐤', '🐥', '🐦', '🐧', '🕊️', '🦅', '🦆', '🦢', '🦉', '🦤', '🪶', '🦩', '🦚', '🦜', '🐸', '🐊', '🐢', '🦎', '🐍', '🐲', '🐉', '🦕', '🦖', '🐳', '🐋', '🐬', '🦭', '🐟', '🐠', '🐡', '🦈', '🐙', '🐚', '🪸', '🐌', '🐛', '🐜', '🐝', '🪲', '🐞', '🦗', '🪳', '🕷️', '🕸️', '🦂', '🦟', '🪰', '🪱', '🦠', '💐', '🌸', '💮', '🏵️', '🌹', '🥀', '🌺', '🌻', '🌼', '🌷', '🌱', '🪴', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🪹', '🪺', '🍄', '🌰'],
  food: ['🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑', '🍍', '🥝', '🍅', '🫒', '🥥', '🥑', '🍆', '🥔', '🥕', '🌽', '🌶️', '🫑', '🥒', '🥬', '🥦', '🧄', '🧅', '🍄', '🥜', '🫘', '🌰', '🍞', '🥐', '🥖', '🫓', '🥨', '🥯', '🥞', '🧇', '🧀', '🍖', '🍗', '🥩', '🥓', '🍔', '🍟', '🍕', '🌭', '🥪', '🌮', '🌯', '🫔', '🥙', '🧆', '🥚', '🍳', '🥘', '🍲', '🫕', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦀', '🦞', '🦐', '🦑', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕️', '🫖', '🍵', '🍶', '🍾', '🍷', '🍸', '🍹', '🍺', '🍻', '🥂', '🥃', '🫗', '🥤', '🧋', '🧃', '🧉', '🧊', '🥢', '🍽️', '🍴', '🥄', '🔪', '🫙', '🏺'],
}

const currentEmojis = computed(() => {
  return emojisByCategory[emojiCategory.value] || emojisByCategory.popular
})

const messageAuthor = computed(() => {
  if (!props.message) return ''
  const author = props.message.author
  if (!author) return 'Неизвестно'
  if (author.id === props.currentUserId) return 'Вы'
  return author.firstName || author.displayName || author.username || 'Пользователь'
})

const messagePreview = computed(() => {
  if (!props.message) return ''
  const text = props.message.text || ''
  if (text.length > 100) return text.substring(0, 100) + '...'
  return text || 'Вложение'
})

const isOwn = computed(() => {
  if (!props.message) return false
  const authorId = props.message.author?.id || props.message.createdBy
  return String(authorId) === String(props.currentUserId)
})

const canEdit = computed(() => isOwn.value)
const canDelete = computed(() => isOwn.value || props.canManage)
const canPin = computed(() => props.canManage)

function getReactions() {
  let reactions = props.message?.reactions || props.message?.data?.reactions || {}
  if (typeof reactions === 'string') {
    try {
      reactions = JSON.parse(reactions)
    } catch (e) {
      reactions = {}
    }
  }
  return reactions
}

function hasUserReacted(emoji) {
  const reactions = getReactions()
  const users = reactions[emoji] || []
  return users.some(u => u?.user_id === props.currentUserId)
}

function toggleReaction(emoji) {
  emit('toggle-reaction', emoji)
  close()
}

function selectEmoji(emoji) {
  emit('toggle-reaction', emoji)
  showEmojiPicker.value = false
  close()
}

function reply() {
  emit('reply')
  close()
}

function forward() {
  emit('forward')
  close()
}

function pin() {
  emit('pin')
  close()
}

function edit() {
  emit('edit')
  close()
}

function deleteMsg() {
  emit('delete')
  close()
}

function copyText() {
  emit('copy-text')
  close()
}

function close() {
  showEmojiPicker.value = false
  emit('close')
}

function select() {
  emit('select')
  close()
}
</script>

<style scoped>
.mobile-actions-sheet {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.mobile-actions-content {
  background: var(--bg-primary);
  border-radius: 16px 16px 0 0;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.2s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.mobile-actions-header {
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.mobile-message-preview {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px;
}

.preview-author {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent-primary);
  margin-bottom: 4px;
}

.preview-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mobile-quick-reactions {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.mobile-reaction-btn {
  width: 48px;
  height: 48px;
  border: none;
  background: var(--bg-secondary);
  border-radius: 50%;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}

.mobile-reaction-btn.active {
  background: var(--reaction-active, rgba(0, 128, 105, 0.2));
}

.mobile-reaction-btn.more {
  color: var(--text-secondary);
  font-size: 18px;
}

.mobile-actions-list {
  padding: 8px;
}

.mobile-action-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-size: 16px;
  cursor: pointer;
  border-radius: 8px;
}

.mobile-action-item:active {
  background: var(--bg-hover);
}

.mobile-action-item i {
  width: 24px;
  text-align: center;
  color: var(--text-secondary);
}

.mobile-action-item.danger {
  color: var(--danger-color);
}

.mobile-action-item.danger i {
  color: var(--danger-color);
}

.mobile-action-close {
  margin: 8px 16px 16px;
  padding: 14px;
  border: none;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 500;
  border-radius: 12px;
  cursor: pointer;
}

.mobile-emoji-picker {
  display: flex;
  flex-direction: column;
  height: 400px;
}

.mobile-emoji-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.mobile-emoji-header span {
  font-weight: 600;
  font-size: 16px;
}

.btn-back {
  width: 36px;
  height: 36px;
  border: none;
  background: var(--bg-secondary);
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
}

.mobile-emoji-categories {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  overflow-x: auto;
  scrollbar-width: none;
}

.mobile-emoji-categories::-webkit-scrollbar {
  display: none;
}

.mobile-emoji-cat-btn {
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 24px;
  cursor: pointer;
  flex-shrink: 0;
}

.mobile-emoji-cat-btn.active {
  background: var(--reaction-active, rgba(0, 128, 105, 0.15));
}

.mobile-emoji-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  padding: 8px;
  overflow-y: auto;
}

.mobile-emoji-btn {
  width: 44px;
  height: 44px;
  border: none;
  background: transparent;
  border-radius: 8px;
  font-size: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-emoji-btn:active {
  background: var(--bg-hover);
  transform: scale(1.1);
}

/* Скрываем на десктопе */
@media (min-width: 769px) {
  .mobile-actions-sheet {
    display: none;
  }
}
</style>