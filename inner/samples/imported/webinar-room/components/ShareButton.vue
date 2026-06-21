<template>
  <div>
    <button class="share-trigger" @click="showModal = true" title="Поделиться эфиром">
      <i class="fas fa-share-nodes"></i>
    </button>

    <Teleport to="body">
      <Transition name="share-overlay">
        <div v-if="showModal" class="share-overlay" @click.self="closeModal">
          <Transition name="share-panel" appear>
            <div v-if="showModal" class="share-panel">
              <!-- Handle bar (mobile feel) -->
              <div class="share-handle-bar">
                <div class="share-handle"></div>
              </div>

              <!-- Title -->
              <div class="share-title-row">
                <span class="share-title">Поделиться</span>
                <button class="share-close" @click="closeModal">
                  <i class="fas fa-xmark"></i>
                </button>
              </div>

              <!-- Channel icons row -->
              <div class="share-channels">
                <a
                  v-for="(ch, i) in channels"
                  :key="ch.id"
                  :href="ch.url"
                  target="_blank"
                  class="share-channel"
                  :style="{ '--delay': i * 40 + 'ms' }"
                  @click="trackShare(ch.id)"
                >
                  <div class="share-channel-icon" :style="{ background: ch.gradient }">
                    <i :class="ch.icon"></i>
                  </div>
                  <span class="share-channel-name">{{ ch.label }}</span>
                </a>
              </div>

              <!-- Divider -->
              <div class="share-divider">
                <span class="share-divider-text">или скопируйте ссылку</span>
              </div>

              <!-- Copy link -->
              <div class="share-copy-row" :class="{ 'is-copied': copied }">
                <div class="share-copy-url">
                  <i class="fas fa-link share-copy-link-icon"></i>
                  <input
                    ref="linkInput"
                    type="text"
                    readonly
                    :value="shareUrl"
                    class="share-copy-input"
                    @click="copyLink"
                  />
                </div>
                <button class="share-copy-btn" @click="copyLink">
                  <Transition name="share-check" mode="out-in">
                    <i v-if="copied" key="check" class="fas fa-check"></i>
                    <i v-else key="copy" class="fas fa-copy"></i>
                  </Transition>
                  <span class="share-copy-label">{{ copied ? 'Готово' : 'Копировать' }}</span>
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { episodePageRoute } from '../episode'

const props = defineProps({
  episode: { type: Object, required: true }
})

const showModal = ref(false)
const copied = ref(false)
const linkInput = ref(null)

function closeModal() {
  showModal.value = false
}

const shareUrl = computed(() => {
  return episodePageRoute({ id: props.episode.id }).url()
})

const shareText = computed(() => {
  return `${props.episode.title} — присоединяйтесь к эфиру!`
})

const telegramUrl = computed(() => {
  return `https://t.me/share/url?url=${encodeURIComponent(shareUrl.value)}&text=${encodeURIComponent(shareText.value)}`
})

const whatsappUrl = computed(() => {
  return `https://wa.me/?text=${encodeURIComponent(shareText.value + ' ' + shareUrl.value)}`
})

const vkUrl = computed(() => {
  return `https://vk.com/share.php?url=${encodeURIComponent(shareUrl.value)}&title=${encodeURIComponent(shareText.value)}`
})

const emailUrl = computed(() => {
  return `mailto:?subject=${encodeURIComponent(shareText.value)}&body=${encodeURIComponent(shareText.value + '\n\n' + shareUrl.value)}`
})

const smsUrl = computed(() => {
  const text = shareText.value + ' ' + shareUrl.value
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent)
  return isIOS ? `sms:&body=${encodeURIComponent(text)}` : `sms:?body=${encodeURIComponent(text)}`
})

const channels = computed(() => [
  {
    id: 'telegram',
    label: 'Telegram',
    icon: 'fab fa-telegram-plane',
    gradient: 'linear-gradient(135deg, #37AEE2, #1E96C8)',
    url: telegramUrl.value
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'fab fa-whatsapp',
    gradient: 'linear-gradient(135deg, #25D366, #128C7E)',
    url: whatsappUrl.value
  },
  {
    id: 'vk',
    label: 'ВКонтакте',
    icon: 'fab fa-vk',
    gradient: 'linear-gradient(135deg, #5181B8, #3F6DA5)',
    url: vkUrl.value
  },
  {
    id: 'email',
    label: 'Почта',
    icon: 'fas fa-envelope',
    gradient: 'linear-gradient(135deg, #EA4335, #C5221F)',
    url: emailUrl.value
  },
  {
    id: 'sms',
    label: 'SMS',
    icon: 'fas fa-comment-sms',
    gradient: 'linear-gradient(135deg, #34C759, #28A745)',
    url: smsUrl.value
  }
])

function copyLink() {
  if (copied.value) return
  try {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl.value)
    } else if (linkInput.value) {
      linkInput.value.select()
      document.execCommand('copy')
    }
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch {}
}

function trackShare(channel) {
  console.log(`Shared via ${channel}:`, props.episode.id)
}
</script>

<style scoped>
/* Trigger button */
.share-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-tertiary);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

@media (min-width: 640px) {
  .share-trigger {
    width: 36px;
    height: 36px;
    font-size: 15px;
  }
}
.share-trigger:hover {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}

/* Overlay */
.share-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: var(--wr-modal-backdrop);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
@media (min-width: 540px) {
  .share-overlay {
    align-items: center;
  }
}

/* Overlay transition */
.share-overlay-enter-active {
  transition: opacity 0.25s ease;
}
.share-overlay-leave-active {
  transition: opacity 0.2s ease;
}
.share-overlay-enter-from,
.share-overlay-leave-to {
  opacity: 0;
}

/* Panel */
.share-panel {
  width: 100%;
  max-width: 420px;
  background: var(--wr-bg-card);
  border: 1px solid var(--wr-border);
  border-radius: 20px 20px 0 0;
  padding: 0 0 env(safe-area-inset-bottom, 16px) 0;
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
@media (min-width: 540px) {
  .share-panel {
    border-radius: 20px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
  }
}

/* Panel transition */
.share-panel-enter-active {
  transition:
    transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    opacity 0.25s ease;
}
.share-panel-leave-active {
  transition:
    transform 0.22s cubic-bezier(0.4, 0, 1, 1),
    opacity 0.18s ease;
}
.share-panel-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.share-panel-leave-to {
  transform: translateY(60%);
  opacity: 0;
}
@media (min-width: 540px) {
  .share-panel-enter-from {
    transform: translateY(24px) scale(0.96);
    opacity: 0;
  }
  .share-panel-leave-to {
    transform: translateY(12px) scale(0.98);
    opacity: 0;
  }
}

/* Handle bar */
.share-handle-bar {
  display: flex;
  justify-content: center;
  padding: 12px 0 4px;
}
@media (min-width: 540px) {
  .share-handle-bar {
    display: none;
  }
}
.share-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--wr-text-muted);
}

/* Title row */
.share-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
}
.share-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--wr-text-primary);
  letter-spacing: -0.02em;
}
.share-close {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--wr-btn-subtle-bg);
  color: var(--wr-text-tertiary);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  transition: all 0.2s ease;
}
.share-close:hover {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}

/* Channels grid */
.share-channels {
  display: flex;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px 20px;
  flex-wrap: wrap;
}

.share-channel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 68px;
  padding: 10px 4px;
  border-radius: 14px;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  animation: channelAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1) backwards;
  animation-delay: var(--delay);
}
.share-channel:hover {
  background: var(--wr-hover-bg);
}
.share-channel:active {
  transform: scale(0.92);
}

@keyframes channelAppear {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.85);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.share-channel-icon {
  width: 52px;
  height: 52px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 24px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.share-channel:hover .share-channel-icon {
  transform: scale(1.08);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
}

.share-channel-name {
  font-size: 11px;
  font-weight: 600;
  color: var(--wr-text-secondary);
  text-align: center;
  line-height: 1.2;
  white-space: nowrap;
}

/* Divider */
.share-divider {
  display: flex;
  align-items: center;
  padding: 0 20px;
  margin-bottom: 16px;
}
.share-divider::before,
.share-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--wr-border);
}
.share-divider-text {
  padding: 0 12px;
  font-size: 11px;
  font-weight: 500;
  color: var(--wr-text-muted);
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Copy row */
.share-copy-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px 16px;
  padding: 6px 6px 6px 14px;
  border-radius: 14px;
  background: var(--wr-input-bg);
  border: 1px solid var(--wr-input-border);
  transition: all 0.3s ease;
}
.share-copy-row.is-copied {
  border-color: rgba(52, 199, 89, 0.4);
  background: rgba(52, 199, 89, 0.06);
}

.share-copy-url {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
}

.share-copy-link-icon {
  font-size: 13px;
  color: var(--wr-text-muted);
  flex-shrink: 0;
}

.share-copy-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 13px;
  color: var(--wr-text-secondary);
  font-family: inherit;
  cursor: pointer;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  min-width: 0;
}

.share-copy-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  background: var(--wr-btn-subtle-bg);
  border: 1px solid var(--wr-border-light);
  color: var(--wr-text-secondary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: all 0.2s ease;
}
.share-copy-btn:hover {
  background: var(--wr-btn-subtle-hover-bg);
  color: var(--wr-text-primary);
}
.share-copy-btn:active {
  transform: scale(0.96);
}
.is-copied .share-copy-btn {
  background: rgba(52, 199, 89, 0.15);
  border-color: rgba(52, 199, 89, 0.25);
  color: #34c759;
}

.share-copy-btn i {
  font-size: 13px;
}
.share-copy-label {
  font-size: 13px;
}

/* Check icon transition */
.share-check-enter-active {
  transition: all 0.2s ease;
}
.share-check-leave-active {
  transition: all 0.15s ease;
}
.share-check-enter-from {
  transform: scale(0.5);
  opacity: 0;
}
.share-check-leave-to {
  transform: scale(0.5);
  opacity: 0;
}

@media (max-width: 380px) {
  .share-copy-label {
    display: none;
  }
  .share-copy-btn {
    padding: 0 10px;
  }
  .share-channels {
    gap: 2px;
  }
  .share-channel {
    width: 60px;
    padding: 8px 2px;
  }
  .share-channel-icon {
    width: 46px;
    height: 46px;
    font-size: 20px;
    border-radius: 14px;
  }
  .share-channel-name {
    font-size: 10px;
  }
}
</style>
