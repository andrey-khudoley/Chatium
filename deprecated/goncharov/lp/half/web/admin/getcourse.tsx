import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import Settings from '../../tables/settings.table'
import { HeadStyles } from '../../styles'

export const adminGetcourseRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const apiKeySetting = await Settings.findOneBy(ctx, { key: 'getcourse_api_key' })
  const offerCodeSetting = await Settings.findOneBy(ctx, { key: 'getcourse_offer_code' })
  const accountNameSetting = await Settings.findOneBy(ctx, { key: 'getcourse_account_name' })
  const priceSetting = await Settings.findOneBy(ctx, { key: 'getcourse_price' })
  const utmSourceFieldSetting = await Settings.findOneBy(ctx, { key: 'getcourse_utm_source_field' })
  const utmMediumFieldSetting = await Settings.findOneBy(ctx, { key: 'getcourse_utm_medium_field' })
  const utmCampaignFieldSetting = await Settings.findOneBy(ctx, {
    key: 'getcourse_utm_campaign_field'
  })
  const utmContentFieldSetting = await Settings.findOneBy(ctx, {
    key: 'getcourse_utm_content_field'
  })
  const utmTermFieldSetting = await Settings.findOneBy(ctx, { key: 'getcourse_utm_term_field' })

  const apiKey = apiKeySetting?.value || ''
  const offerCode = offerCodeSetting?.value || ''
  const accountName = accountNameSetting?.value || ''
  const price = priceSetting?.value || '0'
  const utmSourceField = utmSourceFieldSetting?.value || ''
  const utmMediumField = utmMediumFieldSetting?.value || ''
  const utmCampaignField = utmCampaignFieldSetting?.value || ''
  const utmContentField = utmContentFieldSetting?.value || ''
  const utmTermField = utmTermFieldSetting?.value || ''
  const isConfigured = !!(apiKey && offerCode && accountName)

  return (
    <html>
      <head>
        <title>Настройки GetCourse — Жизнь вполсилы</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script src="https://unpkg.com/vue@3.5.13/dist/vue.global.prod.js"></script>
        <HeadStyles />
        <style>{`
          body {
            background: linear-gradient(135deg, #fdfcf9 0%, #f5f0e8 30%, #ebe0d0 70%, #e8e0d0 100%);
            min-height: 100vh;
            position: relative;
            overflow-x: hidden;
          }

          .glass-panel {
            background: rgba(255, 255, 255, 0.75);
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            border: 2px solid rgba(255, 255, 255, 0.5);
            border-radius: 28px;
            box-shadow: 0 20px 60px rgba(94, 80, 63, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.6) inset;
            padding: 48px;
            position: relative;
            overflow: hidden;
          }

          .glass-panel::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent);
          }

          .back-link {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: #5e503f;
            font-family: 'Source Sans 3', sans-serif;
            font-size: 15px;
            font-weight: 500;
            text-decoration: none;
            padding: 12px 24px;
            background: rgba(255, 255, 255, 0.5);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            border: 1.5px solid rgba(255, 255, 255, 0.6);
            transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .back-link:hover {
            transform: translateX(-4px);
            background: rgba(255, 255, 255, 0.7);
            box-shadow: 0 8px 24px rgba(94, 80, 63, 0.08);
          }

          .title-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 72px;
            height: 72px;
            background: linear-gradient(135deg, #7f9b76 0%, #6a8560 100%);
            border-radius: 20px;
            color: white;
            font-size: 32px;
            box-shadow: 0 12px 32px rgba(127, 155, 118, 0.3);
            animation: expandIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both, rotate360 1.2s ease-out 0.2s;
          }

          @keyframes rotate360 {
            from { transform: rotate(0deg) scale(0.8); }
            to { transform: rotate(360deg) scale(1); }
          }

          .main-title {
            font-family: 'Cormorant Garamond', serif;
            font-size: 38px;
            font-weight: 700;
            color: #2d2d2d;
            letter-spacing: 0.02em;
            margin: 0;
            animation: breatheIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both;
          }

          .description {
            font-family: 'Source Sans 3', sans-serif;
            font-size: 16px;
            color: #7a7166;
            line-height: 1.6;
            margin: 12px 0 0;
            animation: breatheIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both;
          }

          .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 20px;
            border-radius: 14px;
            font-family: 'Source Sans 3', sans-serif;
            font-size: 14px;
            font-weight: 600;
            animation: breatheIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both;
          }

          .status-badge.configured {
            background: linear-gradient(135deg, rgba(127, 155, 118, 0.15) 0%, rgba(106, 133, 96, 0.2) 100%);
            color: #6a8560;
            border: 1.5px solid rgba(127, 155, 118, 0.3);
          }

          .status-badge.not-configured {
            background: linear-gradient(135deg, rgba(205, 170, 125, 0.15) 0%, rgba(191, 158, 117, 0.2) 100%);
            color: #bf9e75;
            border: 1.5px solid rgba(205, 170, 125, 0.3);
          }

          .form-group {
            margin-bottom: 28px;
          }

          .label-text {
            display: flex;
            align-items: center;
            font-family: 'Source Sans 3', sans-serif;
            font-size: 15px;
            font-weight: 600;
            color: #5e503f;
            margin-bottom: 10px;
          }

          .hint-text {
            font-family: 'Source Sans 3', sans-serif;
            font-size: 13px;
            color: #a89f93;
            margin-top: 6px;
            font-style: italic;
          }

          .input-field {
            width: 100%;
            padding: 14px 18px;
            font-family: 'Source Sans 3', sans-serif;
            font-size: 15px;
            color: #2d2d2d;
            background: rgba(255, 255, 255, 0.6);
            border: 2px solid rgba(94, 80, 63, 0.12);
            border-radius: 14px;
            transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
            box-sizing: border-box;
          }

          .input-field:focus {
            outline: none;
            border-color: #7f9b76;
            background: rgba(255, 255, 255, 0.85);
            box-shadow: 0 6px 20px rgba(127, 155, 118, 0.15);
            transform: translateY(-2px);
          }

          .input-wrapper {
            position: relative;
          }

          .toggle-password {
            position: absolute;
            right: 16px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #a89f93;
            cursor: pointer;
            font-size: 16px;
            transition: color 0.3s;
            padding: 4px;
          }

          .toggle-password:hover {
            color: #7f9b76;
          }

          .btn {
            font-family: 'Source Sans 3', sans-serif;
            font-size: 16px;
            font-weight: 600;
            padding: 16px 36px;
            border-radius: 16px;
            border: none;
            cursor: pointer;
            transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
            position: relative;
            overflow: hidden;
          }

          .btn-primary {
            background: linear-gradient(135deg, #cdaa7d 0%, #bf9e75 50%, #cdaa7d 100%);
            background-size: 200% 100%;
            color: #ffffff;
            box-shadow: 0 12px 32px rgba(205, 170, 125, 0.35);
          }

          .btn-primary:hover:not(:disabled) {
            background-position: 100% 0;
            transform: translateY(-3px) scale(1.02);
            box-shadow: 0 18px 42px rgba(205, 170, 125, 0.45);
          }

          .btn-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .btn-reset {
            background: rgba(239, 68, 68, 0.1);
            color: #dc2626;
            border: 2px solid rgba(239, 68, 68, 0.2);
          }

          .btn-reset:hover:not(:disabled) {
            background: rgba(239, 68, 68, 0.15);
            transform: scale(1.02);
          }

          .info-card {
            background: linear-gradient(135deg, rgba(127, 155, 118, 0.08) 0%, rgba(106, 133, 96, 0.12) 100%);
            border: 1.5px solid rgba(127, 155, 118, 0.2);
            border-radius: 18px;
            padding: 24px;
            margin-top: 32px;
            animation: breatheIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.7s both;
          }

          .info-title {
            font-family: 'Source Sans 3', sans-serif;
            font-size: 16px;
            font-weight: 700;
            color: #6a8560;
            margin: 0 0 12px;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .info-text {
            font-family: 'Source Sans 3', sans-serif;
            font-size: 14px;
            color: #5e503f;
            line-height: 1.6;
            margin: 0;
          }

          .toast {
            position: fixed;
            top: 24px;
            right: 24px;
            padding: 18px 28px;
            border-radius: 16px;
            font-family: 'Source Sans 3', sans-serif;
            font-size: 15px;
            font-weight: 600;
            color: white;
            z-index: 10000;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
            animation: toastIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .toast.success {
            background: linear-gradient(135deg, rgba(127, 155, 118, 0.95) 0%, rgba(106, 133, 96, 0.98) 100%);
          }

          .toast.error {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.95) 0%, rgba(220, 38, 38, 0.98) 100%);
          }

          @keyframes toastIn {
            from {
              opacity: 0;
              transform: translateX(100px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          .organic-blob {
            position: fixed;
            border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
            opacity: 0.08;
            filter: blur(60px);
            animation: float 20s ease-in-out infinite;
            pointer-events: none;
          }

          .blob-1 {
            width: 450px;
            height: 450px;
            background: linear-gradient(135deg, #7f9b76, #cdaa7d);
            top: -100px;
            left: -100px;
            animation-delay: 0s;
          }

          .blob-2 {
            width: 550px;
            height: 550px;
            background: linear-gradient(135deg, #cdaa7d, #bf9e75);
            bottom: -150px;
            right: -150px;
            animation-delay: 7s;
          }

          .blob-3 {
            width: 400px;
            height: 400px;
            background: linear-gradient(135deg, #a8b8a0, #7f9b76);
            top: 40%;
            left: 50%;
            animation-delay: 14s;
          }

          @keyframes float {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            25% { transform: translate(30px, -30px) rotate(5deg); }
            50% { transform: translate(-20px, 20px) rotate(-5deg); }
            75% { transform: translate(20px, 30px) rotate(3deg); }
          }

          .details-section {
            margin-top: 24px;
          }

          .details-summary {
            cursor: pointer;
            list-style: none;
            padding: 16px 20px;
            background: rgba(127, 155, 118, 0.08);
            border: 1.5px solid rgba(127, 155, 118, 0.2);
            border-radius: 14px;
            font-family: 'Source Sans 3', sans-serif;
            font-size: 15px;
            font-weight: 600;
            color: #6a8560;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .details-summary::-webkit-details-marker {
            display: none;
          }

          .details-summary:hover {
            background: rgba(127, 155, 118, 0.12);
          }

          .details-content {
            padding: 24px 0 0;
          }

          .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(45, 45, 45, 0.6);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            animation: fadeIn 0.3s;
          }

          .modal-content {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 40px;
            max-width: 480px;
            width: 90%;
            box-shadow: 0 24px 64px rgba(0, 0, 0, 0.2);
            animation: expandIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .modal-icon {
            width: 64px;
            height: 64px;
            margin: 0 auto 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.2));
            color: #dc2626;
            font-size: 28px;
          }

          .modal-title {
            font-family: 'Cormorant Garamond', serif;
            font-size: 26px;
            font-weight: 700;
            color: #2d2d2d;
            text-align: center;
            margin: 0 0 12px;
          }

          .modal-text {
            font-family: 'Source Sans 3', sans-serif;
            font-size: 15px;
            color: #7a7166;
            text-align: center;
            line-height: 1.6;
            margin: 0 0 32px;
          }

          .modal-buttons {
            display: flex;
            gap: 12px;
          }

          .modal-buttons .btn {
            flex: 1;
          }

          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </head>
      <body>
        <div class="organic-blob blob-1"></div>
        <div class="organic-blob blob-2"></div>
        <div class="organic-blob blob-3"></div>

        <div
          id="app"
          style="padding: 48px 20px; max-width: 720px; margin: 0 auto; position: relative; z-index: 1;"
        >
          <admin-getcourse-settings
            initial-account-name={accountName}
            initial-api-key={apiKey}
            initial-offer-code={offerCode}
            initial-price={price}
            initial-utm-source-field={utmSourceField}
            initial-utm-medium-field={utmMediumField}
            initial-utm-campaign-field={utmCampaignField}
            initial-utm-content-field={utmContentField}
            initial-utm-term-field={utmTermField}
            is-configured={isConfigured.toString()}
          />
        </div>

        <script>{`
          const { createApp } = Vue

          createApp({
            components: {
              AdminGetcourseSettings: {
                props: {
                  initialAccountName: String,
                  initialApiKey: String,
                  initialOfferCode: String,
                  initialPrice: String,
                  initialUtmSourceField: String,
                  initialUtmMediumField: String,
                  initialUtmCampaignField: String,
                  initialUtmContentField: String,
                  initialUtmTermField: String,
                  isConfigured: String,
                },
                data() {
                  return {
                    accountName: this.initialAccountName,
                    apiKey: this.initialApiKey,
                    offerCode: this.initialOfferCode,
                    price: this.initialPrice,
                    utmSourceField: this.initialUtmSourceField,
                    utmMediumField: this.initialUtmMediumField,
                    utmCampaignField: this.initialUtmCampaignField,
                    utmContentField: this.initialUtmContentField,
                    utmTermField: this.initialUtmTermField,
                    showPassword: false,
                    loading: false,
                    toast: null,
                    showResetModal: false,
                  }
                },
                computed: {
                  configured() {
                    return this.isConfigured === 'true'
                  }
                },
                methods: {
                  async saveSettings() {
                    if (!this.accountName || !this.apiKey || !this.offerCode) {
                      this.showToast('Заполните все обязательные поля', 'error')
                      return
                    }

                    this.loading = true
                    try {
                      const response = await fetch('/p/units/goncharov/lp/half/web/admin/getcourseApi~api/save', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          accountName: this.accountName,
                          apiKey: this.apiKey,
                          offerCode: this.offerCode,
                          price: this.price,
                          utmSourceField: this.utmSourceField,
                          utmMediumField: this.utmMediumField,
                          utmCampaignField: this.utmCampaignField,
                          utmContentField: this.utmContentField,
                          utmTermField: this.utmTermField,
                        })
                      })
                      const result = await response.json()

                      if (result.success) {
                        this.showToast('Настройки успешно сохранены', 'success')
                        setTimeout(() => window.location.reload(), 1500)
                      } else {
                        this.showToast(result.error || 'Ошибка сохранения', 'error')
                      }
                    } catch (error) {
                      this.showToast('Ошибка сохранения настроек', 'error')
                      console.error(error)
                    } finally {
                      this.loading = false
                    }
                  },
                  async resetSettings() {
                    this.showResetModal = false
                    this.loading = true
                    try {
                      const response = await fetch('/p/units/goncharov/lp/half/web/admin/getcourseApi~api/reset', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({})
                      })
                      const result = await response.json()

                      if (result.success) {
                        this.showToast('Настройки успешно сброшены', 'success')
                        setTimeout(() => window.location.reload(), 1500)
                      } else {
                        this.showToast(result.error || 'Ошибка сброса', 'error')
                      }
                    } catch (error) {
                      this.showToast('Ошибка сброса настроек', 'error')
                      console.error(error)
                    } finally {
                      this.loading = false
                    }
                  },
                  showToast(message, type) {
                    this.toast = { message, type }
                    setTimeout(() => {
                      this.toast = null
                    }, 4000)
                  },
                  togglePassword() {
                    this.showPassword = !this.showPassword
                  },
                },
                template: \`
                  <div>
                    <a href="/p/units/goncharov/lp/half" class="back-link" style="margin-bottom: 32px;">
                      <i class="fas fa-arrow-left"></i>
                      Вернуться на главную
                    </a>

                    <div class="glass-panel">
                      <div style="display: flex; align-items: center; gap: 24px; margin-bottom: 32px;">
                        <div class="title-icon">
                          <i class="fas fa-cog"></i>
                        </div>
                        <div style="flex: 1;">
                          <h1 class="main-title">Настройки GetCourse</h1>
                          <p class="description">Настройка интеграции с платформой для автоматической передачи регистраций</p>
                        </div>
                        <div>
                          <span :class="['status-badge', configured ? 'configured' : 'not-configured']">
                            <i :class="['fas', configured ? 'fa-check-circle' : 'fa-exclamation-circle']"></i>
                            {{ configured ? 'Интеграция настроена' : 'Требуется настройка' }}
                          </span>
                        </div>
                      </div>

                      <div style="animation: breatheIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s both;">
                        <div class="form-group">
                          <label class="label-text">
                            <i class="fas fa-user-circle" style="margin-right: 6px; color: #7f9b76;"></i>
                            Имя аккаунта GetCourse
                          </label>
                          <input 
                            v-model="accountName"
                            type="text"
                            class="input-field"
                            placeholder="yourschool"
                          />
                          <p class="hint-text">Поддомен вашего аккаунта (например: yourschool.getcourse.ru)</p>
                        </div>

                        <div class="form-group">
                          <label class="label-text">
                            <i class="fas fa-key" style="margin-right: 6px; color: #cdaa7d;"></i>
                            API-ключ
                          </label>
                          <div class="input-wrapper">
                            <input 
                              v-model="apiKey"
                              :type="showPassword ? 'text' : 'password'"
                              class="input-field"
                              placeholder="yourschool_abc123..."
                              style="padding-right: 50px;"
                            />
                            <button type="button" class="toggle-password" @click="togglePassword">
                              <i :class="['fas', showPassword ? 'fa-eye-slash' : 'fa-eye']"></i>
                            </button>
                          </div>
                          <p class="hint-text">Находится в разделе «Настройки → Интеграции → API» GetCourse</p>
                        </div>

                        <div class="form-group">
                          <label class="label-text">
                            <i class="fas fa-tag" style="margin-right: 6px; color: #bf9e75;"></i>
                            Код оффера
                          </label>
                          <input 
                            v-model="offerCode"
                            type="text"
                            class="input-field"
                            placeholder="WEBINAR_HALF"
                          />
                          <p class="hint-text">Уникальный код вашего предложения в GetCourse</p>
                        </div>

                        <div class="form-group">
                          <label class="label-text">
                            <i class="fas fa-ruble-sign" style="margin-right: 6px; color: #6a8560;"></i>
                            Стоимость (руб.)
                          </label>
                          <input 
                            v-model="price"
                            type="number"
                            class="input-field"
                            placeholder="0"
                            min="0"
                          />
                          <p class="hint-text">Если указана стоимость больше 0, пользователь будет автоматически перенаправлен на оплату</p>
                        </div>

                        <details class="details-section">
                          <summary class="details-summary">
                            <i class="fas fa-chart-line"></i>
                            Дополнительные настройки (маппинг UTM-меток)
                            <i class="fas fa-chevron-down" style="margin-left: auto; font-size: 12px;"></i>
                          </summary>
                          <div class="details-content">
                            <p class="hint-text" style="margin-bottom: 20px;">
                              Укажите ID дополнительных полей пользователя в GetCourse для сохранения UTM-меток. 
                              ID полей можно найти в разделе «Настройки → Дополнительные поля».
                            </p>

                            <div class="form-group">
                              <label class="label-text">
                                <i class="fas fa-hashtag" style="margin-right: 6px; color: #a89f93;"></i>
                                ID поля для utm_source
                              </label>
                              <input 
                                v-model="utmSourceField"
                                type="text"
                                class="input-field"
                                placeholder="123456"
                              />
                            </div>

                            <div class="form-group">
                              <label class="label-text">
                                <i class="fas fa-hashtag" style="margin-right: 6px; color: #a89f93;"></i>
                                ID поля для utm_medium
                              </label>
                              <input 
                                v-model="utmMediumField"
                                type="text"
                                class="input-field"
                                placeholder="123457"
                              />
                            </div>

                            <div class="form-group">
                              <label class="label-text">
                                <i class="fas fa-hashtag" style="margin-right: 6px; color: #a89f93;"></i>
                                ID поля для utm_campaign
                              </label>
                              <input 
                                v-model="utmCampaignField"
                                type="text"
                                class="input-field"
                                placeholder="123458"
                              />
                            </div>

                            <div class="form-group">
                              <label class="label-text">
                                <i class="fas fa-hashtag" style="margin-right: 6px; color: #a89f93;"></i>
                                ID поля для utm_content
                              </label>
                              <input 
                                v-model="utmContentField"
                                type="text"
                                class="input-field"
                                placeholder="123459"
                              />
                            </div>

                            <div class="form-group">
                              <label class="label-text">
                                <i class="fas fa-hashtag" style="margin-right: 6px; color: #a89f93;"></i>
                                ID поля для utm_term
                              </label>
                              <input 
                                v-model="utmTermField"
                                type="text"
                                class="input-field"
                                placeholder="123460"
                              />
                            </div>
                          </div>
                        </details>

                        <div style="display: flex; gap: 16px; margin-top: 32px;">
                          <button 
                            @click="saveSettings"
                            :disabled="loading"
                            class="btn btn-primary"
                            style="flex: 1;"
                          >
                            <span v-if="loading" style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                              <span class="spinner"></span>
                              Сохранение...
                            </span>
                            <span v-else style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                              <i class="fas fa-save"></i>
                              Сохранить настройки
                            </span>
                          </button>

                          <button 
                            @click="showResetModal = true"
                            :disabled="loading"
                            class="btn btn-reset"
                          >
                            <i class="fas fa-redo"></i>
                            Сбросить
                          </button>
                        </div>
                      </div>

                      <div class="info-card">
                        <div class="info-title">
                          <i class="fas fa-info-circle"></i>
                          Как работает интеграция
                        </div>
                        <p class="info-text">
                          При каждой регистрации на вебинар данные автоматически передаются в GetCourse через API. 
                          Создаётся новая сделка с контактами пользователя и всеми UTM-метками для детальной аналитики.
                          Если указана стоимость больше 0, пользователь будет автоматически перенаправлен на страницу оплаты.
                        </p>
                      </div>
                    </div>

                    <div v-if="showResetModal" class="modal-overlay" @click.self="showResetModal = false">
                      <div class="modal-content">
                        <div class="modal-icon">
                          <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h3 class="modal-title">Подтвердите сброс</h3>
                        <p class="modal-text">
                          Все настройки GetCourse будут удалены. Это действие нельзя отменить.
                        </p>
                        <div class="modal-buttons">
                          <button @click="showResetModal = false" class="btn" style="background: #e5e7eb; color: #374151;">
                            Отмена
                          </button>
                          <button @click="resetSettings" class="btn btn-reset">
                            Сбросить
                          </button>
                        </div>
                      </div>
                    </div>

                    <div v-if="toast" :class="['toast', toast.type]">
                      <i :class="['fas', toast.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle']"></i>
                      {{ toast.message }}
                    </div>
                  </div>
                \`
              }
            }
          }).mount('#app')
        `}</script>
      </body>
    </html>
  )
})
