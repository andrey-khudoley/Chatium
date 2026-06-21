<template>
  <div class="game-container">
    <div class="game-header">
      <div class="score">
        <span class="player-label">You</span>
        <span class="score-value">{{ playerScore }}</span>
      </div>
      <button v-if="!gameStarted" @click="startGame" class="start-btn">
        {{ gameOver ? 'Play Again' : 'Start Game' }}
      </button>
      <button v-if="gameStarted" @click="pauseGame" class="pause-btn">
        {{ paused ? 'Resume' : 'Pause' }}
      </button>
      <div class="score">
        <span class="score-value">{{ aiScore }}</span>
        <span class="player-label">AI</span>
      </div>
    </div>

    <canvas
      ref="canvas"
      @mousemove="handleMouseMove"
      @touchmove="handleTouchMove"
      class="game-canvas"
      :class="{ 'game-active': gameStarted && !paused }"
    ></canvas>

    <div v-if="gameOver" class="game-over">
      <h2>{{ playerScore > aiScore ? '🎉 You Win!' : '😢 AI Wins!' }}</h2>
      <p>Final Score: {{ playerScore }} - {{ aiScore }}</p>
    </div>

    <div class="controls-info">
      <p>🖱️ Move mouse to control your paddle</p>
      <p>📱 Touch and drag on mobile</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const canvas = ref(null)
const playerScore = ref(0)
const aiScore = ref(0)
const gameStarted = ref(false)
const paused = ref(false)
const gameOver = ref(false)

let ctx = null
let animationId = null
let canvasWidth = 800
let canvasHeight = 600

// Game objects
const ball = {
  x: 0,
  y: 0,
  radius: 10,
  speedX: 0,
  speedY: 0,
  maxSpeed: 8
}

const paddleWidth = 12
const paddleHeight = 100

const playerPaddle = {
  x: 30,
  y: 250,
  width: paddleWidth,
  height: paddleHeight,
  speed: 8
}

const aiPaddle = {
  x: 0,
  y: 250,
  width: paddleWidth,
  height: paddleHeight,
  speed: 5
}

function initGame() {
  if (!canvas.value) return

  ctx = canvas.value.getContext('2d')

  // Set canvas size
  const container = canvas.value.parentElement
  canvasWidth = Math.min(800, container.clientWidth - 40)
  canvasHeight = Math.min(600, window.innerHeight - 200)

  canvas.value.width = canvasWidth
  canvas.value.height = canvasHeight

  // Initialize positions
  aiPaddle.x = canvasWidth - 30 - paddleWidth
  resetBall()

  draw()
}

function resetBall() {
  ball.x = canvasWidth / 2
  ball.y = canvasHeight / 2
  const angle = ((Math.random() * Math.PI) / 2 - Math.PI / 4) * (Math.random() > 0.5 ? 1 : -1)
  ball.speedX = Math.cos(angle) * 5 * (Math.random() > 0.5 ? 1 : -1)
  ball.speedY = Math.sin(angle) * 5
}

function startGame() {
  if (gameOver.value) {
    playerScore.value = 0
    aiScore.value = 0
    gameOver.value = false
  }
  gameStarted.value = true
  paused.value = false
  resetBall()
  gameLoop()
}

function pauseGame() {
  paused.value = !paused.value
  if (!paused.value && gameStarted.value) {
    gameLoop()
  }
}

function handleMouseMove(e) {
  if (!gameStarted.value || paused.value) return
  const rect = canvas.value.getBoundingClientRect()
  const y = e.clientY - rect.top
  playerPaddle.y = Math.max(0, Math.min(canvasHeight - paddleHeight, y - paddleHeight / 2))
}

function handleTouchMove(e) {
  if (!gameStarted.value || paused.value) return
  e.preventDefault()
  const rect = canvas.value.getBoundingClientRect()
  const touch = e.touches[0]
  const y = touch.clientY - rect.top
  playerPaddle.y = Math.max(0, Math.min(canvasHeight - paddleHeight, y - paddleHeight / 2))
}

function updateBall() {
  ball.x += ball.speedX
  ball.y += ball.speedY

  // Top and bottom collision
  if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvasHeight) {
    ball.speedY = -ball.speedY
  }

  // Player paddle collision
  if (
    ball.x - ball.radius <= playerPaddle.x + playerPaddle.width &&
    ball.y >= playerPaddle.y &&
    ball.y <= playerPaddle.y + playerPaddle.height &&
    ball.speedX < 0
  ) {
    const hitPos = (ball.y - (playerPaddle.y + playerPaddle.height / 2)) / (playerPaddle.height / 2)
    ball.speedY = hitPos * 5
    ball.speedX = Math.abs(ball.speedX) * 1.05
    ball.speedX = Math.min(ball.speedX, ball.maxSpeed)
  }

  // AI paddle collision
  if (
    ball.x + ball.radius >= aiPaddle.x &&
    ball.y >= aiPaddle.y &&
    ball.y <= aiPaddle.y + aiPaddle.height &&
    ball.speedX > 0
  ) {
    const hitPos = (ball.y - (aiPaddle.y + aiPaddle.height / 2)) / (aiPaddle.height / 2)
    ball.speedY = hitPos * 5
    ball.speedX = -Math.abs(ball.speedX) * 1.05
    ball.speedX = Math.max(ball.speedX, -ball.maxSpeed)
  }

  // Score
  if (ball.x - ball.radius <= 0) {
    aiScore.value++
    checkGameOver()
    resetBall()
  } else if (ball.x + ball.radius >= canvasWidth) {
    playerScore.value++
    checkGameOver()
    resetBall()
  }
}

function checkGameOver() {
  if (playerScore.value >= 5 || aiScore.value >= 5) {
    gameOver.value = true
    gameStarted.value = false
    paused.value = false
  }
}

function updateAI() {
  const paddleCenter = aiPaddle.y + aiPaddle.height / 2
  const difficulty = 0.7 // AI reaction speed (0-1)

  if (ball.speedX > 0) {
    // Ball moving towards AI
    if (paddleCenter < ball.y - 10) {
      aiPaddle.y += aiPaddle.speed * difficulty
    } else if (paddleCenter > ball.y + 10) {
      aiPaddle.y -= aiPaddle.speed * difficulty
    }
  }

  // Keep AI paddle in bounds
  aiPaddle.y = Math.max(0, Math.min(canvasHeight - aiPaddle.height, aiPaddle.y))
}

function draw() {
  if (!ctx) return

  // Clear canvas
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // Draw center line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.lineWidth = 2
  ctx.setLineDash([10, 10])
  ctx.beginPath()
  ctx.moveTo(canvasWidth / 2, 0)
  ctx.lineTo(canvasWidth / 2, canvasHeight)
  ctx.stroke()
  ctx.setLineDash([])

  // Draw paddles
  ctx.fillStyle = '#00d9ff'
  ctx.fillRect(playerPaddle.x, playerPaddle.y, playerPaddle.width, playerPaddle.height)

  ctx.fillStyle = '#ff3366'
  ctx.fillRect(aiPaddle.x, aiPaddle.y, aiPaddle.width, aiPaddle.height)

  // Draw ball
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
  ctx.fill()
}

function gameLoop() {
  if (!gameStarted.value || paused.value) {
    if (animationId) {
      cancelAnimationFrame(animationId)
      animationId = null
    }
    return
  }

  updateBall()
  updateAI()
  draw()

  animationId = requestAnimationFrame(gameLoop)
}

onMounted(() => {
  initGame()
  window.addEventListener('resize', initGame)
})

onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', initGame)
})
</script>

<style scoped>
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
  padding: 20px;
  font-family: 'Arial', sans-serif;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: 800px;
  margin-bottom: 20px;
  gap: 20px;
}

.score {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: white;
  min-width: 100px;
}

.player-label {
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 2px;
  opacity: 0.7;
  margin-bottom: 5px;
}

.score-value {
  font-size: 48px;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
}

.start-btn,
.pause-btn {
  padding: 15px 30px;
  font-size: 18px;
  font-weight: bold;
  color: white;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.start-btn:hover,
.pause-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.start-btn:active,
.pause-btn:active {
  transform: translateY(0);
}

.game-canvas {
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  background: #1a1a2e;
}

.game-canvas.game-active {
  cursor: none;
}

.game-over {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.9);
  padding: 40px 60px;
  border-radius: 20px;
  text-align: center;
  color: white;
  box-shadow: 0 10px 50px rgba(0, 0, 0, 0.8);
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.game-over h2 {
  margin: 0 0 20px 0;
  font-size: 36px;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
}

.game-over p {
  margin: 0;
  font-size: 20px;
  opacity: 0.8;
}

.controls-info {
  margin-top: 20px;
  text-align: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
}

.controls-info p {
  margin: 5px 0;
}

@media (max-width: 768px) {
  .game-header {
    flex-wrap: wrap;
  }

  .score-value {
    font-size: 36px;
  }

  .start-btn,
  .pause-btn {
    padding: 12px 24px;
    font-size: 16px;
  }

  .game-over h2 {
    font-size: 28px;
  }

  .game-over p {
    font-size: 18px;
  }
}
</style>
