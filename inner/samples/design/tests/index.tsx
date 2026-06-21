// @shared
import { jsx } from '@app/html-jsx'
import UnitTestsPage from './pages/UnitTestsPage.vue'

export const testsPageRoute = app.get('/', async (ctx) => {
  return (
    <html>
      <UnitTestsPage />
    </html>
  )
})
