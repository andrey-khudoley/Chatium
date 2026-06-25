import '@app/html-jsx'
declare global {
  namespace JSX {
    interface IntrinsicElements {
      [key: string]: any
    }
  }
  const app: any
  interface Window {
    __BOOT__?: any
  }
}
export {}
