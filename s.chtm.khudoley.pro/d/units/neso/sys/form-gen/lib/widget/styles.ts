/**
 * Стили виджета (§5.1 спеки — «фрагмент самодостаточен»). Все селекторы с
 * префиксом `fg-` — изоляция от стилей принимающей страницы; глобальных
 * селекторов (input{}, button{}) НЕТ намеренно.
 */
export const WIDGET_CSS = `
.fg-form{font-family:inherit;max-width:420px;box-sizing:border-box}
.fg-form *{box-sizing:border-box}
.fg-field{margin-bottom:12px}
.fg-field label{display:block;margin-bottom:4px;font-size:14px;color:#333}
.fg-field input,.fg-field select{width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;font-size:14px}
.fg-title{font-size:18px;font-weight:600;margin:0 0 12px}
.fg-note{font-size:12px;color:#888;margin-top:8px}
.fg-submit{width:100%;padding:10px 16px;border:none;border-radius:6px;background:#2f6feb;color:#fff;font-size:15px;cursor:pointer}
.fg-submit:disabled{opacity:.6;cursor:default}
.fg-error{margin-top:10px;padding:8px 10px;border-radius:6px;background:#fdecec;color:#b3261e;font-size:13px;display:none}
.fg-error.fg-error-visible{display:block}
.fg-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9998}
.fg-modal{position:relative;background:#fff;border-radius:10px;padding:24px;max-width:460px;width:90%;max-height:90vh;overflow:auto;z-index:9999}
.fg-modal-close{position:absolute;top:10px;right:14px;background:none;border:none;font-size:20px;line-height:1;cursor:pointer;color:#888}
`.trim()
