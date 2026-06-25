// @shared
export const APP_TITLE = 'BPM Терминал'

export const SCREEN_TITLES: Record<string, string> = {
  home: 'Сегодня',
  journal: 'Журнал',
  tasks: 'Задачи',
  dialogs: 'Диалоги',
  finances: 'Финансы',
  para: 'PARA',
  tools: 'Инструменты',
  services: 'Сервисы',
  library: 'Библиотека',
  detail: 'Детали',
  components: 'Компоненты',
  stub: ''
}

export const SCREEN_CODES: Record<string, string> = {
  home: 'HM',
  journal: 'JN',
  tasks: 'TS',
  dialogs: 'DG',
  finances: 'FN',
  para: 'PR',
  tools: 'TL',
  services: 'SV',
  library: 'LB',
  detail: 'DT',
  components: 'CP',
  stub: '--'
}

export type Screen = keyof typeof SCREEN_TITLES
