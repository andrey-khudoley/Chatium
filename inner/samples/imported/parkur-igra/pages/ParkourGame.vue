<template>
  <div class="game-container">
    <div class="game-info">
      <h1>🤸 Паркур Игра</h1>
      <div class="stats">
        <div class="stat">
          <span class="label">Трюки:</span>
          <span class="value">{{ tricksCount }}</span>
        </div>
        <div class="stat">
          <span class="label">Сальто вперёд:</span>
          <span class="value">{{ frontFlips }}</span>
        </div>
        <div class="stat">
          <span class="label">Сальто назад:</span>
          <span class="value">{{ backFlips }}</span>
        </div>
      </div>
    </div>

    <canvas ref="canvas" width="800" height="600"></canvas>

    <!-- Мобильные кнопки управления -->
    <div class="mobile-controls">
      <div class="left-controls">
        <button
          class="control-btn direction-btn"
          @touchstart.prevent="handleMobileInput('left', true)"
          @touchend.prevent="handleMobileInput('left', false)"
          @mousedown.prevent="handleMobileInput('left', true)"
          @mouseup.prevent="handleMobileInput('left', false)"
        >
          ←
        </button>
        <button
          class="control-btn direction-btn"
          @touchstart.prevent="handleMobileInput('right', true)"
          @touchend.prevent="handleMobileInput('right', false)"
          @mousedown.prevent="handleMobileInput('right', true)"
          @mouseup.prevent="handleMobileInput('right', false)"
        >
          →
        </button>
      </div>

      <div class="right-controls">
        <button
          class="control-btn trick-btn"
          @touchstart.prevent="handleMobileInput('flipForward', true)"
          @touchend.prevent="handleMobileInput('flipForward', false)"
          @mousedown.prevent="handleMobileInput('flipForward', true)"
          @mouseup.prevent="handleMobileInput('flipForward', false)"
        >
          ↑<br /><span>Вперёд</span>
        </button>
        <button
          class="control-btn jump-btn"
          @touchstart.prevent="handleMobileInput('jump', true)"
          @mousedown.prevent="handleMobileInput('jump', true)"
        >
          🤸
        </button>
        <button
          class="control-btn trick-btn"
          @touchstart.prevent="handleMobileInput('flipBack', true)"
          @touchend.prevent="handleMobileInput('flipBack', false)"
          @mousedown.prevent="handleMobileInput('flipBack', true)"
          @mouseup.prevent="handleMobileInput('flipBack', false)"
        >
          ↓<br /><span>Назад</span>
        </button>
      </div>
    </div>

    <div class="controls">
      <div class="control-group">
        <h3>Управление:</h3>
        <p><strong>← / A</strong> - Влево</p>
        <p><strong>→ / D</strong> - Вправо</p>
        <p><strong>Пробел</strong> - Прыжок</p>
        <p><strong>↑ / W</strong> - Сальто вперёд (в воздухе)</p>
        <p><strong>↓ / S</strong> - Сальто назад (в воздухе)</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvas = ref(null)
const tricksCount = ref(0)
const frontFlips = ref(0)
const backFlips = ref(0)

let ctx = null
let animationId = null

const player = {
  x: 100,
  y: 400,
  width: 30,
  height: 50,
  velocityX: 0,
  velocityY: 0,
  speed: 5,
  jumpPower: -15,
  rotation: 0,
  rotationSpeed: 0,
  isOnGround: false,
  color: '#ff6b6b'
}

const platforms = [
  { x: 0, y: 550, width: 800, height: 50, color: '#4ecdc4' },
  { x: 200, y: 450, width: 150, height: 20, color: '#45b7af' },
  { x: 450, y: 350, width: 150, height: 20, color: '#45b7af' },
  { x: 150, y: 250, width: 100, height: 20, color: '#45b7af' },
  { x: 600, y: 200, width: 120, height: 20, color: '#45b7af' },
  { x: 350, y: 150, width: 100, height: 20, color: '#45b7af' }
]

const gravity = 0.6
const keys = {}
const mobileInput = {
  left: false,
  right: false,
  jump: false,
  flipForward: false,
  flipBack: false
}

const handleMobileInput = (action, isPressed) => {
  if (action === 'left') {
    mobileInput.left = isPressed
  } else if (action === 'right') {
    mobileInput.right = isPressed
  } else if (action === 'jump' && isPressed) {
    if (player.isOnGround) {
      player.velocityY = player.jumpPower
      player.isOnGround = false
    }
  } else if (action === 'flipForward' && isPressed && !player.isOnGround) {
    player.rotationSpeed = 0.3
    if (Math.abs(player.rotation % (Math.PI * 2)) < 0.5) {
      frontFlips.value++
      tricksCount.value++
    }
  } else if (action === 'flipBack' && isPressed && !player.isOnGround) {
    player.rotationSpeed = -0.3
    if (Math.abs(player.rotation % (Math.PI * 2)) < 0.5) {
      backFlips.value++
      tricksCount.value++
    }
  }
}

const handleKeyDown = (e) => {
  keys[e.key.toLowerCase()] = true

  if (e.key === ' ') {
    e.preventDefault()
    if (player.isOnGround) {
      player.velocityY = player.jumpPower
      player.isOnGround = false
    }
  }

  if ((e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') && !player.isOnGround) {
    player.rotationSpeed = 0.3
    if (Math.abs(player.rotation % (Math.PI * 2)) < 0.5) {
      frontFlips.value++
      tricksCount.value++
    }
  }

  if ((e.key === 'ArrowDown' || e.key.toLowerCase() === 's') && !player.isOnGround) {
    player.rotationSpeed = -0.3
    if (Math.abs(player.rotation % (Math.PI * 2)) < 0.5) {
      backFlips.value++
      tricksCount.value++
    }
  }
}

const handleKeyUp = (e) => {
  keys[e.key.toLowerCase()] = false
}

const checkCollision = (rect1, rect2) => {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  )
}

const update = () => {
  if (keys['arrowleft'] || keys['a'] || mobileInput.left) {
    player.velocityX = -player.speed
  } else if (keys['arrowright'] || keys['d'] || mobileInput.right) {
    player.velocityX = player.speed
  } else {
    player.velocityX *= 0.8
  }

  player.velocityY += gravity

  player.x += player.velocityX
  player.y += player.velocityY

  if (!player.isOnGround) {
    player.rotation += player.rotationSpeed
  } else {
    player.rotation = 0
    player.rotationSpeed = 0
  }

  if (player.x < 0) player.x = 0
  if (player.x + player.width > 800) player.x = 800 - player.width

  player.isOnGround = false

  for (const platform of platforms) {
    if (checkCollision(player, platform)) {
      if (player.velocityY > 0) {
        player.y = platform.y - player.height
        player.velocityY = 0
        player.isOnGround = true
        player.rotation = 0
        player.rotationSpeed = 0
      }
    }
  }

  if (player.y > 600) {
    player.x = 100
    player.y = 400
    player.velocityX = 0
    player.velocityY = 0
    player.rotation = 0
  }
}

const draw = () => {
  ctx.clearRect(0, 0, 800, 600)

  ctx.fillStyle = '#f0f0f0'
  ctx.fillRect(0, 0, 800, 600)

  platforms.forEach((platform) => {
    ctx.fillStyle = platform.color
    ctx.fillRect(platform.x, platform.y, platform.width, platform.height)

    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.3
    ctx.fillRect(platform.x, platform.y, platform.width, 5)
    ctx.globalAlpha = 1
  })

  ctx.save()
  ctx.translate(player.x + player.width / 2, player.y + player.height / 2)
  ctx.rotate(player.rotation)

  ctx.fillStyle = player.color
  ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(-player.width / 2 + 5, -player.height / 2 + 5, 8, 8)
  ctx.fillRect(-player.width / 2 + 17, -player.height / 2 + 5, 8, 8)

  ctx.fillStyle = '#000000'
  ctx.fillRect(-player.width / 2 + 7, -player.height / 2 + 7, 4, 4)
  ctx.fillRect(-player.width / 2 + 19, -player.height / 2 + 7, 4, 4)

  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(0, 5, 8, 0, Math.PI)
  ctx.fill()

  ctx.restore()

  if (!player.isOnGround) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    ctx.lineWidth = 2
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.arc(player.x + player.width / 2, player.y + player.height / 2, 40, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
  }
}

const gameLoop = () => {
  update()
  draw()
  animationId = requestAnimationFrame(gameLoop)
}

onMounted(() => {
  ctx = canvas.value.getContext('2d')

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)

  gameLoop()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)

  if (animationId) {
    cancelAnimationFrame(animationId)
  }
})
</script>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 20px;
}

.game-info {
  background: rgba(255, 255, 255, 0.95);
  padding: 20px 40px;
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.game-info h1 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 2em;
}

.stats {
  display: flex;
  gap: 30px;
  justify-content: center;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.stat .label {
  font-size: 0.9em;
  color: #666;
  font-weight: 500;
}

.stat .value {
  font-size: 2em;
  font-weight: bold;
  color: #667eea;
}

canvas {
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  background: #f0f0f0;
}

.controls {
  background: rgba(255, 255, 255, 0.95);
  padding: 20px 30px;
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  max-width: 800px;
}

.control-group h3 {
  margin: 0 0 10px 0;
  color: #333;
}

.control-group p {
  margin: 5px 0;
  color: #666;
  font-size: 0.95em;
}

.control-group strong {
  color: #667eea;
  font-weight: 600;
}

.mobile-controls {
  display: none;
  position: fixed;
  bottom: 20px;
  left: 0;
  right: 0;
  padding: 0 20px;
  z-index: 1000;
  justify-content: space-between;
  align-items: flex-end;
  pointer-events: none;
}

.mobile-controls > * {
  pointer-events: auto;
}

.left-controls,
.right-controls {
  display: flex;
  gap: 15px;
  align-items: center;
}

.right-controls {
  flex-direction: column;
  gap: 10px;
}

.control-btn {
  width: 70px;
  height: 70px;
  border: none;
  border-radius: 15px;
  background: rgba(102, 126, 234, 0.9);
  color: white;
  font-size: 32px;
  font-weight: bold;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.1s;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
}

.control-btn:active {
  transform: scale(0.95);
  background: rgba(102, 126, 234, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.direction-btn {
  width: 70px;
  height: 70px;
}

.jump-btn {
  width: 80px;
  height: 80px;
  background: rgba(255, 107, 107, 0.9);
  font-size: 40px;
}

.jump-btn:active {
  background: rgba(255, 107, 107, 1);
}

.trick-btn {
  width: 65px;
  height: 65px;
  background: rgba(78, 205, 196, 0.9);
  font-size: 24px;
}

.trick-btn span {
  font-size: 10px;
  margin-top: -5px;
}

.trick-btn:active {
  background: rgba(78, 205, 196, 1);
}

@media (max-width: 850px) {
  canvas {
    width: 100%;
    max-width: 800px;
    height: auto;
  }

  .stats {
    flex-direction: column;
    gap: 10px;
  }

  .game-info h1 {
    font-size: 1.5em;
  }

  .mobile-controls {
    display: flex;
  }

  .controls {
    display: none;
  }
}

@media (max-width: 480px) {
  .control-btn {
    width: 60px;
    height: 60px;
    font-size: 28px;
  }

  .jump-btn {
    width: 70px;
    height: 70px;
    font-size: 36px;
  }

  .trick-btn {
    width: 55px;
    height: 55px;
    font-size: 20px;
  }
}
</style>
