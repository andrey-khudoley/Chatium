<template>
  <div class="gradient-bg min-h-screen flex items-center justify-center order-t-form-container">
    <div class="order-t-decorative order-t-decorative-1"></div>
    <div class="order-t-decorative order-t-decorative-2"></div>

    <div class="order-t-form-wrapper">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.order-t-form-container {
  padding: 1rem;
  position: relative;
  overflow: hidden;
}

.order-t-decorative {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}

.order-t-decorative-1 {
  top: 10%;
  left: 5%;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(212, 184, 150, 0.08) 0%, transparent 70%);
}

.order-t-decorative-2 {
  bottom: 10%;
  right: 5%;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(200, 168, 128, 0.06) 0%, transparent 70%);
}

.order-t-form-wrapper {
  width: 90%;
  max-width: 520px;
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}

@media (min-width: 768px) {
  .order-t-form-wrapper {
    width: 70%;
    max-width: 700px;
  }
}

@media (min-width: 1200px) {
  .order-t-form-wrapper {
    width: 50%;
    max-width: 800px;
  }
}

@media (min-width: 1600px) {
  .order-t-form-wrapper {
    max-width: 900px;
  }
}

@media (max-width: 640px) {
  .order-t-form-container {
    padding: 0.5rem;
  }
}
</style>
