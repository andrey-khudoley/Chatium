// @shared

export interface Card {
  id: string
  title: string
  subtitle: string
  description: string
  insight: string
  icon: string
  color: string
  gradient: string
  imageUrl: string
}

export const cards: Card[] = [
  {
    id: 'speed',
    title: 'Карта Скорости',
    subtitle: 'Время — твой капитал',
    description:
      'Сегодня звезды благоволят мастерам, которые ценят каждую минуту. Скорость работы определяет твой доход.',
    insight:
      'Мастера, которые работают быстро и качественно, зарабатывают в 3-5 раз больше. Научись оптимизировать каждое движение.',
    icon: '⚡',
    color: '#FFD700',
    gradient: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    imageUrl: 'https://fs.cdn-chatium.io/get/image_gc_6CNsnHQWNg.1024x1024.png'
  },
  {
    id: 'price',
    title: 'Карта Ценности',
    subtitle: 'Твоя работа бесценна',
    description: 'Вселенная посылает знак: пора повысить цены. Ты достойна большего.',
    insight:
      'Клиенты готовы платить за мастерство. Узнай, как правильно формировать цену и перестать работать за копейки.',
    icon: '💎',
    color: '#9333EA',
    gradient: 'linear-gradient(135deg, #9333EA 0%, #DB2777 100%)',
    imageUrl: 'https://fs.cdn-chatium.io/get/image_gc_X8MytEjHT6.1024x1024.png'
  },
  {
    id: 'client',
    title: 'Карта Притяжения',
    subtitle: 'Клиенты идут к тебе',
    description:
      'Магия клиентского потока открывается тем, кто знает секреты притяжения идеальных клиентов.',
    insight:
      'Научись работать только с любимыми клиентами и отсекать токсичных. Запись на месяц вперед — это реально.',
    icon: '✨',
    color: '#EC4899',
    gradient: 'linear-gradient(135deg, #EC4899 0%, #F97316 100%)',
    imageUrl: 'https://fs.cdn-chatium.io/get/image_gc_HNsMDfXgpW.1024x1024.png'
  },
  {
    id: 'energy',
    title: 'Карта Энергии',
    subtitle: 'Работай без выгорания',
    description: 'Сегодня особенно важно беречь свою энергию. Выгорание — враг мастера.',
    insight:
      'Узнай, как работать 5 часов в день и зарабатывать как за 12. Система энергоэффективной работы.',
    icon: '🔥',
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    imageUrl: 'https://fs.cdn-chatium.io/get/image_gc_TTjPmOoxTD.1024x1024.png'
  },
  {
    id: 'mastery',
    title: 'Карта Мастерства',
    subtitle: 'Совершенству нет предела',
    description: 'Настало время выйти на новый уровень. ТОП-мастера — это не талант, это система.',
    insight:
      'Секретные техники, которые превращают обычного мастера в ТОП-специалиста с очередью из клиентов.',
    icon: '👑',
    color: '#3B82F6',
    gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    imageUrl: 'https://fs.cdn-chatium.io/get/image_gc_7GUPf1beiB.1024x1024.png'
  },
  {
    id: 'freedom',
    title: 'Карта Свободы',
    subtitle: 'Управляй своим временем',
    description: 'Ты создана не для того, чтобы работать с утра до ночи. Свобода в твоих руках.',
    insight:
      'Построй систему, которая позволит работать когда хочешь и с кем хочешь. Без жертв и перегрузок.',
    icon: '🦋',
    color: '#06B6D4',
    gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
    imageUrl: 'https://fs.cdn-chatium.io/get/image_gc_3vpUiibVPr.1024x1024.png'
  },
  {
    id: 'abundance',
    title: 'Карта Изобилия',
    subtitle: 'Денежный поток открыт',
    description: 'Изобилие приходит к тем, кто готов его принять. Сегодня твой день.',
    insight:
      'Как выйти на стабильный доход от 200к в месяц и перестать переживать о деньгах. Конкретная система.',
    icon: '💰',
    color: '#10B981',
    gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    imageUrl: 'https://fs.cdn-chatium.io/get/image_gc_ZXQkjJyzoo.1024x1024.png'
  }
]
