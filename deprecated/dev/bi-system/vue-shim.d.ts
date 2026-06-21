declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare namespace app {
  interface Req {
    body?: any
    query?: any
    params?: any
  }

  interface Ctx {
    user?: any
    account?: any
    log?: (message: string) => void
    [key: string]: any
  }
}

type RichUgcCtx = app.Ctx

declare const app: {
  html: (path: string, handler: (ctx: app.Ctx, req: app.Req) => any) => any
  get: (path: string, handler: (ctx: app.Ctx, req: app.Req) => any) => any
  post: (path: string, handler: (ctx: app.Ctx, req: app.Req) => any) => any
  body?: (schema: any) => {
    post: (path: string, handler: (ctx: app.Ctx, req: app.Req) => any) => any
  }
  job?: (path: string, handler: (ctx: app.Ctx, params: any) => any) => any
}
