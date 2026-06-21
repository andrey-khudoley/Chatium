// @shared

export interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  currency: string
}

export const servicesConfig = {
  services: [
    {
      id: 'manicure',
      name: 'Классический маникюр',
      description: 'Базовый уход за ногтями с покрытием гель-лаком',
      price: 1500,
      duration: 90,
      currency: 'RUB'
    },
    {
      id: 'pedicure',
      name: 'Педикюр',
      description: 'Профессиональный уход за ногами и стопами',
      price: 2000,
      duration: 120,
      currency: 'RUB'
    },
    {
      id: 'manicure-design',
      name: 'Маникюр с дизайном',
      description: 'Красивое покрытие с авторским дизайном',
      price: 2500,
      duration: 120,
      currency: 'RUB'
    },
    {
      id: 'nail-extension',
      name: 'Наращивание ногтей',
      description: 'Наращивание гелем или акрилом любой длины',
      price: 3000,
      duration: 150,
      currency: 'RUB'
    },
    {
      id: 'nail-correction',
      name: 'Коррекция наращенных',
      description: 'Коррекция формы и покрытия наращенных ногтей',
      price: 2200,
      duration: 120,
      currency: 'RUB'
    },
    {
      id: 'nail-strengthening',
      name: 'Укрепление ногтей',
      description: 'Укрепление натуральной ногтевой пластины',
      price: 1800,
      duration: 90,
      currency: 'RUB'
    }
  ] as Service[]
}
