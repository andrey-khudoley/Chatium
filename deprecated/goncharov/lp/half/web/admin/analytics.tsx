import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import Registrations from '../../tables/registrations.table'

export const adminAnalyticsRoute = app.get('/', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin')

  const registrations = await Registrations.findAll(ctx, {
    limit: 100,
    order: [{ createdAt: 'desc' }]
  })

  const totalCount = await Registrations.countBy(ctx, {})

  return (
    <html>
      <head>
        <title>Аналитика регистраций — Жизнь вполсилы</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Source+Sans+3:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <script src="/s/static/lib/tailwind.3.4.16.min.js"></script>
        <style>{`
          * { box-sizing: border-box; }
          body {
            font-family: 'Source Sans 3', sans-serif;
            background: linear-gradient(135deg, #f5f1eb 0%, #ebe4d6 50%, #e8e0d0 100%);
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .font-display { font-family: 'Cormorant Garamond', serif; }
          .glass-panel {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 24px;
            box-shadow: 0 8px 32px rgba(94, 80, 63, 0.1);
          }
          .back-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #8b7355;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s ease;
            margin-bottom: 24px;
          }
          .back-link:hover {
            color: #5e503f;
            transform: translateX(-4px);
          }
          .stat-card {
            background: rgba(255, 255, 255, 0.6);
            border: 1px solid rgba(139, 125, 107, 0.2);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
          }
          .table-container {
            overflow-x: auto;
            margin-top: 24px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            background: rgba(139, 125, 107, 0.1);
            color: #5e503f;
            font-weight: 600;
            text-align: left;
            padding: 14px 16px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 2px solid rgba(139, 125, 107, 0.2);
          }
          td {
            padding: 14px 16px;
            border-bottom: 1px solid rgba(139, 125, 107, 0.1);
            font-size: 14px;
            color: #3d3229;
          }
          tr:hover {
            background: rgba(201, 168, 108, 0.05);
          }
          .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .badge-utm {
            background: rgba(139, 125, 107, 0.1);
            color: #8b7355;
          }
        `}</style>
      </head>
      <body>
        <div style="max-width: 1400px; margin: 0 auto;">
          <a href="/p/units/goncharov/lp/half" class="back-link">
            <i class="fas fa-arrow-left"></i>
            <span>Вернуться на лендинг</span>
          </a>

          <div class="glass-panel" style="padding: 40px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; flex-wrap: wrap; gap: 20px;">
              <div>
                <div
                  style="
                  width: 64px;
                  height: 64px;
                  background: linear-gradient(135deg, #c9a86c 0%, #b8956a 100%);
                  border-radius: 16px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  margin-bottom: 16px;
                  box-shadow: 0 4px 16px rgba(201, 168, 108, 0.3);
                "
                >
                  <i class="fas fa-chart-line" style="color: white; font-size: 28px;"></i>
                </div>
                <h1
                  class="font-display"
                  style="
                  font-size: 32px;
                  font-weight: 600;
                  color: #3d3229;
                  margin: 0 0 8px;
                  letter-spacing: 0.01em;
                "
                >
                  Аналитика регистраций
                </h1>
                <p style="color: #8b7355; margin: 0; font-size: 15px;">
                  Все заявки на вебинар «Жизнь вполсилы»
                </p>
              </div>

              <div class="stat-card" style="min-width: 180px;">
                <div
                  style="
                  font-size: 48px;
                  font-weight: 700;
                  color: #c9a86c;
                  margin-bottom: 8px;
                  font-family: 'Cormorant Garamond', serif;
                "
                >
                  {totalCount}
                </div>
                <div
                  style="
                  font-size: 14px;
                  color: #8b7355;
                  font-weight: 500;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                "
                >
                  Всего регистраций
                </div>
              </div>
            </div>

            {registrations.length === 0 ? (
              <div
                style="
                text-align: center;
                padding: 60px 20px;
                color: #8b7355;
              "
              >
                <i
                  class="fas fa-inbox"
                  style="font-size: 64px; margin-bottom: 20px; opacity: 0.3;"
                ></i>
                <p style="font-size: 18px; margin: 0;">Пока нет регистраций</p>
              </div>
            ) : (
              <div class="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Имя</th>
                      <th>Email</th>
                      <th>Телефон</th>
                      <th>UTM Source</th>
                      <th>UTM Medium</th>
                      <th>UTM Campaign</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrations.map((reg) => (
                      <tr>
                        <td style="white-space: nowrap;">
                          <i class="far fa-clock" style="color: #c9a86c; margin-right: 8px;"></i>
                          {new Date(reg.createdAt).toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td style="font-weight: 500;">
                          <i class="far fa-user" style="color: #8b7355; margin-right: 8px;"></i>
                          {reg.name}
                        </td>
                        <td>
                          <i class="far fa-envelope" style="color: #8b7355; margin-right: 8px;"></i>
                          {reg.email}
                        </td>
                        <td>
                          <i class="fas fa-phone" style="color: #8b7355; margin-right: 8px;"></i>
                          {reg.phone}
                        </td>
                        <td>
                          {reg.utmSource ? (
                            <span class="badge badge-utm">{reg.utmSource}</span>
                          ) : (
                            <span style="color: #a89a8a; font-style: italic;">—</span>
                          )}
                        </td>
                        <td>
                          {reg.utmMedium ? (
                            <span class="badge badge-utm">{reg.utmMedium}</span>
                          ) : (
                            <span style="color: #a89a8a; font-style: italic;">—</span>
                          )}
                        </td>
                        <td>
                          {reg.utmCampaign ? (
                            <span class="badge badge-utm">{reg.utmCampaign}</span>
                          ) : (
                            <span style="color: #a89a8a; font-style: italic;">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {registrations.length > 0 && registrations.length < totalCount && (
              <div
                style="
                margin-top: 24px;
                padding: 16px;
                background: rgba(201, 168, 108, 0.1);
                border-radius: 12px;
                text-align: center;
                color: #8b7355;
                font-size: 14px;
              "
              >
                <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                Показаны последние {registrations.length} из {totalCount} регистраций
              </div>
            )}
          </div>

          <p
            style="
            text-align: center;
            color: #a89a8a;
            font-size: 13px;
            margin-top: 24px;
          "
          >
            <i class="fas fa-shield-alt" style="margin-right: 6px;"></i>
            Доступ только для администраторов
          </p>
        </div>
      </body>
    </html>
  )
})
