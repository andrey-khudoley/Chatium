<template>
  <div class="welcome-view">
    <div class="welcome-content">
      <div class="welcome-icon">
        <i class="fas fa-comments"></i>
      </div>
      <h2>Добро пожаловать в Чаты</h2>
      <p>Выберите чат слева или создайте новый, чтобы начать общение</p>

      <button @click="$emit('create-chat')" class="btn-welcome">
        <i class="fas fa-plus"></i>
        Создать новый чат
      </button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['create-chat'])
</script>

<style scoped>
.welcome-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.welcome-content {
  text-align: center;
  max-width: 500px;
}

.welcome-icon {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 32px;
  color: white;
  font-size: 56px;
}

.welcome-content h2 {
  font-size: 28px;
  font-weight: 600;
  color: #111b21;
  margin: 0 0 12px;
}

.welcome-content p {
  font-size: 16px;
  color: #667781;
  margin: 0 0 32px;
}

.btn-welcome {
  padding: 14px 28px;
  background: #008069;
  color: white;
  border: none;
  border-radius: 24px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-welcome:hover {
  background: #007a62;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 128, 105, 0.3);
}

@media (max-width: 768px) {
  .welcome-view {
    display: none;
  }
}
</style>
