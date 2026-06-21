import { jsx } from '@app/html-jsx'
import { requireAccountRole } from '@app/auth'
import TrafficReports from './pages/TrafficReports.vue'
import EventDetails from './pages/EventDetails.vue'
import GalleryPage from './pages/GalleryPage.vue'

// Use export to access index route in components and other modules
export const indexPageRoute = app.get('/', async (ctx, req) => {
  // If gallery query parameter is present, show gallery page without admin check
  if (req.query.gallery !== undefined) {
    return (
      <html>
        <head>
          <title>Отчеты по трафику сайта - Галерея</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
          <style>{`
            body {
              margin: 0;
              padding: 0;
              min-height: 100vh;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            * {
              box-sizing: border-box;
            }
          `}</style>
        </head>
        <body>
          <GalleryPage />
        </body>
      </html>
    )
  }

  // Regular admin page
  requireAccountRole(ctx, 'Admin')

  return (
    <html>
      <head>
        <title>Отчеты по трафику сайта</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <style>{`
          body {
            margin: 0;
            padding: 0;
            min-height: 100vh;
            background: #f7fafc;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          * {
            box-sizing: border-box;
          }
        `}</style>
      </head>
      <body>
        <TrafficReports />
      </body>
    </html>
  )
})

// Route for event details page
export const eventDetailsPageRoute = app.get('/event', async (ctx) => {
  requireAccountRole(ctx, 'Admin')

  return (
    <html>
      <head>
        <title>Детали события - Отчеты по трафику</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="/s/static/lib/fontawesome/6.7.2/css/all.min.css" rel="stylesheet" />
        <style>{`
          body { margin: 0; padding: 0; min-height: 100vh; background: #f7fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          * { box-sizing: border-box; }
        `}</style>
      </head>
      <body>
        <EventDetails />
      </body>
    </html>
  )
})
