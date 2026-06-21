// Заглушка для импортов *.vue из .tsx/.ts (SSR-компоненты Chatium).
// Подключается только в генерируемый конфиг строгой проверки (scripts/check-types.mjs),
// чтобы погасить ложные TS7016 на границе .tsx→.vue. На проверку самих .vue
// внутри vue-tsc не влияет.
declare module '*.vue' {
  const component: any
  export default component
}
