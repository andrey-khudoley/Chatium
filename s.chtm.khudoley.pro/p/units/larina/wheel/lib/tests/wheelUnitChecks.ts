/**
 * Юнит-проверки тем оформления и email-хелперов колеса.
 * Часть templateUnitSuite (вызывается из runTemplateUnitChecks).
 * Только чистые функции — без ctx, Heap, асинхронности.
 */
import { THEMES, getTheme } from '../../config/themes'
import { normalizeEmail, isValidEmail, maskEmail } from '../wheel.lib'
import { type TemplateUnitTestResult, tryPush } from './templateUnitSuiteHelpers'

// ---------------------------------------------------------------------------
// config/themes
// ---------------------------------------------------------------------------

export function runThemesChecks(results: TemplateUnitTestResult[]): void {
  tryPush(results, 'themes_count_at_least_6', 'не менее 6 тем', () => {
    return THEMES.length >= 6
  })

  tryPush(results, 'themes_ids_unique', 'id тем уникальны', () => {
    const ids = THEMES.map((t) => t.id)
    return new Set(ids).size === ids.length
  })

  tryPush(results, 'themes_getTheme_known', 'getTheme(known) → объект темы', () => {
    const theme = getTheme('gold')
    return theme.id === 'gold' && theme.segFills.length > 0 && theme.pageBg.length > 0
  })

  tryPush(results, 'themes_getTheme_fallback', 'getTheme(unknown) → дефолт', () => {
    return getTheme('nonexistent').id === getTheme('gold').id
  })

  tryPush(results, 'themes_all_have_segfills', 'у всех тем непустые segFills/segTexts', () => {
    return THEMES.every((t) => t.segFills.length >= 2 && t.segTexts.length >= 2)
  })
}

// ---------------------------------------------------------------------------
// wheel.lib — normalizeEmail / isValidEmail
// ---------------------------------------------------------------------------

export function runWheelEmailChecks(results: TemplateUnitTestResult[]): void {
  tryPush(results, 'wheel_normalizeEmail_trim_lowercase', 'normalizeEmail trim + lowercase', () => {
    return normalizeEmail('  Foo@BAR.com ') === 'foo@bar.com'
  })

  tryPush(results, 'wheel_normalizeEmail_idempotent', 'normalizeEmail идемпотентен', () => {
    const x = '  TEST@Example.ORG  '
    return normalizeEmail(normalizeEmail(x)) === normalizeEmail(x)
  })

  tryPush(results, 'wheel_isValidEmail_valid', 'isValidEmail валидный', () => {
    return isValidEmail('a@b.co') === true
  })

  tryPush(results, 'wheel_isValidEmail_no_at', 'isValidEmail без @', () => {
    return isValidEmail('abc') === false
  })

  tryPush(results, 'wheel_isValidEmail_no_domain', 'isValidEmail без домена', () => {
    return isValidEmail('a@b') === false
  })

  tryPush(results, 'wheel_isValidEmail_spaces', 'isValidEmail с пробелами', () => {
    return isValidEmail('a @b.co') === false
  })

  tryPush(results, 'wheel_isValidEmail_empty', 'isValidEmail пустой', () => {
    return isValidEmail('') === false
  })

  // ---------------------------------------------------------------------------
  // maskEmail — §16.10
  // ---------------------------------------------------------------------------

  tryPush(
    results,
    'wheel_maskEmail_basic',
    'maskEmail tester@khudoley.pro → te***@***ey.pro',
    () => {
      // tester → te*** ; khudoley.pro → name=khudoley(>2)→***ey, tld=pro → ***ey.pro
      return maskEmail('tester@khudoley.pro') === 'te***@***ey.pro'
    }
  )

  tryPush(results, 'wheel_maskEmail_short_local', 'maskEmail короткий local', () => {
    // ab@example.com: local=ab(<=2)→a*; domain=example.com, name=example(>2)→***le, tld=com → ***le.com
    // итог: a*@***le.com
    return maskEmail('ab@example.com') === 'a*@***le.com'
  })

  tryPush(results, 'wheel_maskEmail_no_dot_domain', 'maskEmail домен без точки', () => {
    // user@localhost: local=user(>2)→us***; domain=localhost(нет точки)→***st
    // итог: us***@***st
    return maskEmail('user@localhost') === 'us***@***st'
  })

  tryPush(results, 'wheel_maskEmail_no_at', 'maskEmail без @ → ***', () => {
    return maskEmail('plainstring') === '***'
  })
}
