<template>
  <div class="gallery-page">
    <div class="container">
      <h1 class="title">📊 Отчеты по трафику сайта</h1>

      <div class="description">
        <p class="intro">
          Простое и удобное приложение для анализа трафика вашего сайта с использованием данных из
          аналитики Chatium.
        </p>

        <div class="features">
          <h2>Основные возможности:</h2>

          <div class="feature-item">
            <i class="fas fa-list"></i>
            <div>
              <h3>Детальные события</h3>
              <p>
                Просмотр всех посещений сайта с подробной информацией о каждом событии: время, URL,
                данные пользователя, устройство и геолокация
              </p>
            </div>
          </div>

          <div class="feature-item">
            <i class="fas fa-chart-bar"></i>
            <div>
              <h3>Статистика</h3>
              <p>
                Обзор ключевых метрик: количество уникальных пользователей, общее количество
                посещений, среднее количество посещений на пользователя
              </p>
            </div>
          </div>

          <div class="feature-item">
            <i class="fas fa-filter"></i>
            <div>
              <h3>Гибкие фильтры</h3>
              <p>
                Фильтрация событий по дате, URL, ID пользователя, email с возможностью быстрого
                поиска и сброса фильтров
              </p>
            </div>
          </div>

          <div class="feature-item">
            <i class="fas fa-search"></i>
            <div>
              <h3>Поиск пользователей</h3>
              <p>
                Поиск по имени, фамилии или email с поддержкой частичного совпадения и кликабельными
                ссылками для быстрой фильтрации
              </p>
            </div>
          </div>

          <div class="feature-item">
            <i class="fas fa-mobile-alt"></i>
            <div>
              <h3>Адаптивный дизайн</h3>
              <p>
                Удобный интерфейс, оптимизированный для работы на любых устройствах - от мобильных
                до десктопных
              </p>
            </div>
          </div>

          <div class="feature-item">
            <i class="fas fa-list-ol"></i>
            <div>
              <h3>Пагинация</h3>
              <p>
                Удобная навигация по большим объемам данных с настраиваемым количеством записей на
                странице
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.gallery-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
  padding: 40px 20px;
}

.container {
  max-width: 900px;
  margin: 0 auto;
}

.title {
  font-size: 2.5rem;
  color: #0c4a6e;
  text-align: center;
  margin-bottom: 30px;
  font-weight: 700;
}

.description {
  background: white;
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.intro {
  font-size: 1.2rem;
  color: #475569;
  text-align: center;
  margin-bottom: 40px;
  line-height: 1.6;
}

.features h2 {
  font-size: 1.8rem;
  color: #0c4a6e;
  margin-bottom: 30px;
  text-align: center;
}

.feature-item {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 12px;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.feature-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.feature-item i {
  font-size: 2rem;
  color: #0284c7;
  flex-shrink: 0;
  margin-top: 5px;
}

.feature-item h3 {
  font-size: 1.25rem;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.feature-item p {
  font-size: 1rem;
  color: #64748b;
  margin: 0;
  line-height: 1.6;
}

@media (max-width: 768px) {
  .title {
    font-size: 2rem;
  }

  .description {
    padding: 24px;
  }

  .intro {
    font-size: 1.1rem;
  }

  .features h2 {
    font-size: 1.5rem;
  }

  .feature-item {
    flex-direction: column;
    gap: 12px;
  }

  .feature-item i {
    font-size: 1.5rem;
  }
}
</style>
