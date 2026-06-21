// @shared

function px(value: number | undefined) {
  return value !== undefined ? value + 'px' : undefined
}

export interface AppUiStyle {
  flexDirection?: 'row' | 'column'
  flexGrow?: number
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  marginLeft?: number
  marginRight?: number
  marginTop?: number
  marginBottom?: number
}

export function appUiStyleToCss(style: AppUiStyle = {}) {
  return {
    display: style.flexDirection ? 'flex' : 'block',
    'flex-direction': style.flexDirection,
    'flex-grow': style.flexGrow,
    'padding-left': px(style.paddingLeft),
    'padding-right': px(style.paddingRight),
    'padding-top': px(style.paddingTop),
    'padding-bottom': px(style.paddingBottom),
    'margin-left': px(style.marginLeft),
    'margin-right': px(style.marginRight),
    'margin-top': px(style.marginTop),
    'margin-bottom': px(style.marginBottom)
  }
}
