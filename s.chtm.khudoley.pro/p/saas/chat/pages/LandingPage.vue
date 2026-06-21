<template>
  <div class="landing-page">
    <!-- Header -->
    <header class="landing-header">
      <div class="header-content">
        <div class="logo">
          <div class="logo-icon">
            <i class="fas fa-comments"></i>
          </div>
          <span class="logo-text">Chatium Chat</span>
        </div>
        <a :href="loginUrl" class="btn-login">
          <i class="fas fa-user"></i>
          Войти
        </a>
      </div>
    </header>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-text">
          <h1>Общайтесь без границ</h1>
          <p class="hero-subtitle">
            Современный мессенджер для команд, друзей и сообществ. Быстро, безопасно и удобно —
            прямо в браузере.
          </p>
          <div class="hero-actions">
            <a :href="loginUrl" class="btn-primary-large">
              <i class="fas fa-rocket"></i>
              Начать общаться
            </a>
            <a href="#features" class="btn-secondary-large"> Узнать больше </a>
          </div>
          <div class="hero-stats">
            <div class="stat">
              <span class="stat-number">∞</span>
              <span class="stat-label">Чатов</span>
            </div>
            <div class="stat">
              <span class="stat-number">100%</span>
              <span class="stat-label">Бесплатно</span>
            </div>
            <div class="stat">
              <span class="stat-number">0₽</span>
              <span class="stat-label">Подписок</span>
            </div>
          </div>
        </div>
        <div class="hero-visual">
          <div class="chat-preview">
            <div class="chat-messages">
              <div class="message received">
                <div
                  class="message-avatar"
                  style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                >
                  <span>А</span>
                </div>
                <div class="message-content">
                  <div class="message-author">Алексей</div>
                  <div class="message-text">Привет! Когда встречаемся?</div>
                  <div class="message-time">10:42</div>
                </div>
              </div>
              <div class="message sent">
                <div class="message-content">
                  <div class="message-text">Привет! Давай в 19:00 у офиса</div>
                  <div class="message-time">10:43 ✓✓</div>
                </div>
              </div>
              <div class="message received">
                <div
                  class="message-avatar"
                  style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
                >
                  <span>М</span>
                </div>
                <div class="message-content">
                  <div class="message-author">Мария</div>
                  <div class="message-text">Отлично, буду! 🎉</div>
                  <div class="message-time">10:45</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="features">
      <div class="section-header">
        <h2>Возможности</h2>
        <p>Всё, что нужно для комфортного общения</p>
      </div>
      <div class="features-grid">
        <div class="feature-card">
          <div
            class="feature-icon"
            style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          >
            <i class="fas fa-bolt"></i>
          </div>
          <h3>Мгновенные сообщения</h3>
          <p>Отправляйте текстовые сообщения моментально. Никаких задержек и ожиданий.</p>
        </div>
        <div class="feature-card">
          <div
            class="feature-icon"
            style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
          >
            <i class="fas fa-users"></i>
          </div>
          <h3>Групповые чаты</h3>
          <p>
            Создавайте чаты для команд, проектов или друзей. Добавляйте неограниченное количество
            участников.
          </p>
        </div>
        <div class="feature-card">
          <div
            class="feature-icon"
            style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)"
          >
            <i class="fas fa-shield-alt"></i>
          </div>
          <h3>Безопасность</h3>
          <p>Ваши данные под надежной защитой. Только вы решаете, кто может видеть ваши чаты.</p>
        </div>
        <div class="feature-card">
          <div
            class="feature-icon"
            style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)"
          >
            <i class="fas fa-mobile-alt"></i>
          </div>
          <h3>Адаптивный дизайн</h3>
          <p>Работает на любом устройстве — компьютере, планшете или телефоне.</p>
        </div>
        <div class="feature-card">
          <div
            class="feature-icon"
            style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)"
          >
            <i class="fas fa-history"></i>
          </div>
          <h3>История сообщений</h3>
          <p>Все сообщения сохраняются. Вы всегда можете найти важную информацию.</p>
        </div>
        <div class="feature-card">
          <div
            class="feature-icon"
            style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)"
          >
            <i class="fas fa-bell"></i>
          </div>
          <h3>Уведомления</h3>
          <p>Никогда не пропускайте важные сообщения. Получайте уведомления о новых сообщениях.</p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section class="how-it-works">
      <div class="section-header">
        <h2>Как это работает</h2>
        <p>Начните общаться за 3 простых шага</p>
      </div>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-icon">
            <i class="fas fa-user-plus"></i>
          </div>
          <h3>Авторизуйтесь</h3>
          <p>Войдите через систему Chatium — быстро и безопасно</p>
        </div>
        <div class="step-arrow">
          <i class="fas fa-chevron-right"></i>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-icon">
            <i class="fas fa-plus-circle"></i>
          </div>
          <h3>Создайте чат</h3>
          <p>Групповой или личный — выберите подходящий формат</p>
        </div>
        <div class="step-arrow">
          <i class="fas fa-chevron-right"></i>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-icon">
            <i class="fas fa-paper-plane"></i>
          </div>
          <h3>Начните общение</h3>
          <p>Приглашайте друзей и общайтесь без ограничений</p>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="cta-content">
        <h2>Готовы начать?</h2>
        <p>Присоединяйтесь к тысячам пользователей, которые уже общаются в Chatium Chat</p>
        <a :href="loginUrl" class="btn-cta">
          <i class="fas fa-comments"></i>
          Создать аккаунт бесплатно
        </a>
        <p class="cta-note">Никаких скрытых платежей и подписок</p>
      </div>
    </section>

    <!-- Footer -->
    <footer class="landing-footer">
      <div class="footer-content">
        <div class="footer-brand">
          <div class="logo">
            <div class="logo-icon small">
              <i class="fas fa-comments"></i>
            </div>
            <span class="logo-text">Chatium Chat</span>
          </div>
          <p>Простой и удобный мессенджер для всех</p>
        </div>
        <div class="footer-links">
          <a href="#features">Возможности</a>
          <a :href="loginUrl">Войти</a>
        </div>
      </div>
      <div class="footer-bottom">
        <p>© 2026 Chatium Chat. Создано на платформе Chatium.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
// Используем относительный путь для редиректа после входа
// Браузер автоматически разрешит относительно текущего origin
const loginUrl = '/s/auth/signin'
</script>

<style scoped>
.landing-page {
  min-height: 100vh;
  background: #fff;
}

/* Header */
.landing-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid #e0e0e0;
  z-index: 1000;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, #008069 0%, #00a884 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.logo-icon.small {
  width: 32px;
  height: 32px;
  font-size: 16px;
}

.logo-text {
  font-size: 20px;
  font-weight: 700;
  color: #111b21;
}

.btn-login {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #008069;
  color: white;
  text-decoration: none;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-login:hover {
  background: #007a62;
  transform: translateY(-1px);
}

/* Hero */
.hero {
  padding: 140px 24px 80px;
  background: linear-gradient(180deg, #f0f2f5 0%, #fff 100%);
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-text h1 {
  font-size: 52px;
  font-weight: 800;
  color: #111b21;
  line-height: 1.1;
  margin: 0 0 20px;
}

.hero-subtitle {
  font-size: 18px;
  color: #667781;
  line-height: 1.6;
  margin: 0 0 32px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 40px;
}

.btn-primary-large {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 32px;
  background: #008069;
  color: white;
  text-decoration: none;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 4px 14px rgba(0, 128, 105, 0.3);
}

.btn-primary-large:hover {
  background: #007a62;
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 128, 105, 0.4);
}

.btn-secondary-large {
  display: flex;
  align-items: center;
  padding: 16px 32px;
  background: transparent;
  color: #008069;
  text-decoration: none;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 500;
  border: 2px solid #008069;
  transition: all 0.2s;
}

.btn-secondary-large:hover {
  background: rgba(0, 128, 105, 0.05);
}

.hero-stats {
  display: flex;
  gap: 40px;
}

.hero-stats .stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 36px;
  font-weight: 800;
  color: #008069;
}

.stat-label {
  font-size: 14px;
  color: #667781;
}

/* Hero Visual */
.hero-visual {
  display: flex;
  justify-content: center;
}

.chat-preview {
  width: 340px;
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  padding: 20px;
  transform: perspective(1000px) rotateY(-5deg) rotateX(5deg);
  transition: transform 0.3s;
}

.chat-preview:hover {
  transform: perspective(1000px) rotateY(0deg) rotateX(0deg);
}

.chat-messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.message.sent {
  justify-content: flex-end;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
}

.message-content {
  max-width: 240px;
  padding: 10px 14px;
  border-radius: 16px;
  position: relative;
}

.message.received .message-content {
  background: #f0f2f5;
  border-bottom-left-radius: 4px;
}

.message.sent .message-content {
  background: #d9fdd3;
  border-bottom-right-radius: 4px;
}

.message-author {
  font-size: 12px;
  font-weight: 600;
  color: #667eea;
  margin-bottom: 2px;
}

.message-text {
  font-size: 14px;
  color: #111b21;
  line-height: 1.4;
}

.message-time {
  font-size: 11px;
  color: #8696a0;
  margin-top: 4px;
  text-align: right;
}

/* Features */
.features {
  padding: 80px 24px;
  background: #fff;
}

.section-header {
  text-align: center;
  margin-bottom: 60px;
}

.section-header h2 {
  font-size: 36px;
  font-weight: 700;
  color: #111b21;
  margin: 0 0 12px;
}

.section-header p {
  font-size: 18px;
  color: #667781;
  margin: 0;
}

.features-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

.feature-card {
  padding: 32px;
  background: #fff;
  border-radius: 20px;
  border: 1px solid #e0e0e0;
  transition: all 0.3s;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.1);
  border-color: transparent;
}

.feature-icon {
  width: 60px;
  height: 60px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
  margin-bottom: 20px;
}

.feature-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111b21;
  margin: 0 0 10px;
}

.feature-card p {
  font-size: 14px;
  color: #667781;
  line-height: 1.6;
  margin: 0;
}

/* How it works */
.how-it-works {
  padding: 80px 24px;
  background: #f0f2f5;
}

.steps {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.step {
  flex: 1;
  text-align: center;
  padding: 40px 24px;
  background: white;
  border-radius: 20px;
  position: relative;
}

.step-number {
  position: absolute;
  top: -15px;
  left: 50%;
  transform: translateX(-50%);
  width: 30px;
  height: 30px;
  background: #008069;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

.step-icon {
  width: 70px;
  height: 70px;
  background: linear-gradient(135deg, #008069 0%, #00a884 100%);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  color: white;
  font-size: 28px;
}

.step h3 {
  font-size: 18px;
  font-weight: 600;
  color: #111b21;
  margin: 0 0 10px;
}

.step p {
  font-size: 14px;
  color: #667781;
  margin: 0;
}

.step-arrow {
  color: #008069;
  font-size: 24px;
  flex-shrink: 0;
}

/* CTA Section */
.cta-section {
  padding: 100px 24px;
  background: linear-gradient(135deg, #008069 0%, #00a884 100%);
  text-align: center;
}

.cta-content h2 {
  font-size: 40px;
  font-weight: 700;
  color: white;
  margin: 0 0 16px;
}

.cta-content p {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0 0 32px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.btn-cta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 18px 36px;
  background: white;
  color: #008069;
  text-decoration: none;
  border-radius: 30px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.btn-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.3);
}

.cta-note {
  font-size: 14px !important;
  color: rgba(255, 255, 255, 0.7) !important;
  margin-top: 20px !important;
}

/* Footer */
.landing-footer {
  background: #111b21;
  color: white;
  padding: 60px 24px 24px;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.footer-brand p {
  font-size: 14px;
  color: #8696a0;
  margin: 12px 0 0;
}

.footer-links {
  display: flex;
  gap: 32px;
}

.footer-links a {
  color: #8696a0;
  text-decoration: none;
  font-size: 14px;
  transition: color 0.2s;
}

.footer-links a:hover {
  color: white;
}

.footer-bottom {
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 24px;
  border-top: 1px solid #2a3942;
  text-align: center;
}

.footer-bottom p {
  font-size: 13px;
  color: #667781;
  margin: 0;
}

/* Responsive */
@media (max-width: 1024px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-text h1 {
    font-size: 40px;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-stats {
    justify-content: center;
  }

  .hero-visual {
    order: -1;
  }

  .chat-preview {
    transform: none;
  }

  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .hero {
    padding: 120px 20px 60px;
  }

  .hero-text h1 {
    font-size: 32px;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-stats {
    gap: 24px;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .steps {
    flex-direction: column;
  }

  .step-arrow {
    transform: rotate(90deg);
  }

  .footer-content {
    flex-direction: column;
    gap: 24px;
    text-align: center;
  }

  .chat-preview {
    width: 100%;
    max-width: 300px;
  }
}
</style>
