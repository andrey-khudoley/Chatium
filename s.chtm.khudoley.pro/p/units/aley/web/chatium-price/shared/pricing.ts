/**
 * Данные прайс-листа chatium-price.
 *
 * Единственный источник правды по тарифам. Значения взяты из актуального
 * макета (4 тарифа: Бесплатный / Старт / Pro / Макс). Порядок фич в карточке —
 * как в макете. Тариф `featured: true` получает акцентное свечение.
 *
 * Правки тарифов делаются ТОЛЬКО здесь — вёрстка (index.tsx) их не хардкодит.
 */

export interface Tariff {
  /** Уникальный ключ тарифа (для key в списке). */
  id: string
  /** Название тарифа. */
  name: string
  /** Актуальная цена, строка с разрядами (без символа валюты). */
  price: string
  /** Старая (зачёркнутая) цена или null, если акции нет. */
  oldPrice: string | null
  /** Период под ценой. */
  period: string
  /** Подпись на кнопке. */
  ctaLabel: string
  /** Тип кнопки: primary — тёмная, secondary — светлая (для бесплатного). */
  ctaVariant: 'primary' | 'secondary'
  /** Список фич (в порядке отображения). */
  features: string[]
  /** Выделенная карточка с градиентным свечением. */
  featured: boolean
}

/** Символ валюты — вынесен, чтобы не дублировать в вёрстке. */
export const CURRENCY = '₽'

/**
 * Копирайт шапки прайс-листа.
 *
 * `promo` — идущая акция (объясняет зачёркнутые старые цены в карточках).
 * Кнопки хедера ведут на регистрацию/бриф; сейчас это заглушки (`href='#'`),
 * привязать перед публикацией (см. README).
 */
export const HERO = {
  promo: 'Неделя вайбкодинга идёт прямо сейчас',
  title: 'Тарифы',
  subtitle: 'Выберите подходящий план и начните прямо сейчас',
  primaryCta: 'Попробовать бесплатно',
  primaryHref: 'https://chatium.ru/pl~PgbXAgme8dKJyH1zHAQ0start/shtab/hackathon',
  secondaryCta: 'Реализовать свою идею',
  secondaryHref: 'https://chatium.ru/pl~PgbXAgme8dKJyH1zHAQ0start/'
} as const

/**
 * Ссылка кнопок тарифов (все ведут на регистрацию аккаунта).
 * Единая для всех карточек — правится в одном месте.
 */
export const TARIFF_CTA_HREF = 'https://chatium.ru/pl~PgbXAgme8dKJyH1zHAQ0start/app/reg/accounts'

export const TARIFFS: Tariff[] = [
  {
    id: 'free',
    name: 'Бесплатный',
    price: '0',
    oldPrice: null,
    period: 'в месяц',
    ctaLabel: 'Начать бесплатно',
    ctaVariant: 'secondary',
    features: [
      'Вайбкодинг за токены',
      'AI-агенты — сообщение за 1 рубль',
      'Инфраструктура Chatium',
      '1 ГБ файлового хранилища'
    ],
    featured: false
  },
  {
    id: 'start',
    name: 'Старт',
    price: '5 000',
    oldPrice: '10 000',
    period: 'в месяц',
    ctaLabel: 'Перейти на Старт',
    ctaVariant: 'primary',
    features: [
      'Вайбкодинг без токенов',
      'AI-агенты — сообщение за 90 коп.',
      'Инфраструктура Chatium',
      '10 ГБ файлового хранилища'
    ],
    featured: false
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '10 000',
    oldPrice: '15 000',
    period: 'в месяц',
    ctaLabel: 'Перейти на Про',
    ctaVariant: 'primary',
    features: [
      'Вайбкодинг без токенов',
      'AI-агенты — сообщение за 50 коп.',
      'Инфраструктура Chatium',
      'IDE Chatium и свои AI-подписки',
      '50 ГБ файлового хранилища'
    ],
    featured: false
  },
  {
    id: 'max',
    name: 'Макс',
    price: '25 000',
    oldPrice: '35 000',
    period: 'в месяц',
    ctaLabel: 'Перейти на Макс',
    ctaVariant: 'primary',
    features: [
      'Вайбкодинг без токенов',
      'AI-агенты — сообщение за 25 коп.',
      'Бизнес-процессы',
      'IDE Chatium и свои AI-подписки',
      'Инфраструктура Chatium',
      '100 ГБ файлового хранилища'
    ],
    featured: true
  }
]
