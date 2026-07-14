// Type definitions for Chatium JSX (html-jsx)
declare namespace JSX {
  interface IntrinsicElements {
    html: any
    head: any
    body: any
    title: any
    meta: any
    link: any
    script: any
    style: any
    header: any
    nav: any
    main: any
    section: any
    article: any
    aside: any
    footer: any
    div: any
    span: any
    h1: any
    h2: any
    h3: any
    h4: any
    h5: any
    h6: any
    p: any
    pre: any
    blockquote: any
    ul: any
    ol: any
    li: any
    dl: any
    dt: any
    dd: any
    a: any
    strong: any
    em: any
    b: any
    i: any
    u: any
    small: any
    mark: any
    code: any
    form: any
    input: any
    textarea: any
    button: any
    select: any
    option: any
    label: any
    fieldset: any
    legend: any
    table: any
    thead: any
    tbody: any
    tfoot: any
    tr: any
    th: any
    td: any
    img: any
    video: any
    audio: any
    source: any
    iframe: any
    canvas: any
    svg: any
    path: any
    circle: any
    rect: any
    line: any
    polyline: any
    polygon: any
    g: any
    defs: any
    use: any
    br: any
    hr: any
    [elemName: string]: any
  }
  interface ElementChildrenAttribute {
    children: {}
  }
}

declare module '*.vue' {
  const component: any
  export default component
}

declare global {
  const app: {
    html: (path: string, handler: (ctx: any, req: any) => any) => any
    get: (path: string, handler: (ctx: any, req: any) => any) => any
    post: (path: string, handler: (ctx: any, req: any) => any) => any
    job: (name: string, handler: (ctx: any, data: any) => any) => any
  }
}

export {}
