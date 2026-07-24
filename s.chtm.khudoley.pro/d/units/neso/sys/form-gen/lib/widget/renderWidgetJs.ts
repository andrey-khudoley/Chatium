import { VISITOR_FIELDS } from '../../config/constants'
import type { OfferSnapshot, FormAppearance } from '../form/types'

export type RenderWidgetJsInput = {
  slug: string
  offers: OfferSnapshot[]
  appearance: FormAppearance
  submitUrl: string
  css: string
}

/**
 * Экранирование значений, запекаемых в JS-строку виджета (дельта 10 плана) —
 * защита от `</script>`/XSS: JSON.stringify экранирует кавычки/бэкслеши, но
 * НЕ трогает `<`/`>`/`&`.
 */
function escapeForInlineScript(json: string): string {
  return json.replace(/</g, '\\u003C').replace(/>/g, '\\u003E').replace(/&/g, '\\u0026')
}

/**
 * Рендер виджет-скрипта (§5.1 спеки, контракт п.1–3): запечённый конфиг,
 * замена ВСЕХ `<div id="<formID>">` inline-формой, регистрация обработчика
 * модалки в `window.__formGen[slug]` = `{ open(), close() }` (имя/сигнатура —
 * фиксация волны 1, замораживается волной 2 при подтверждении контракта).
 * Отправка — fetch POST x-www-form-urlencoded (§5.2, дельта 2 плана).
 */
export function renderWidgetJs(input: RenderWidgetJsInput): string {
  const configJson = escapeForInlineScript(
    JSON.stringify({
      slug: input.slug,
      offers: input.offers,
      appearance: input.appearance,
      submitUrl: input.submitUrl,
      visitorFields: VISITOR_FIELDS,
      css: input.css
    })
  )

  return `;(function(){
  var CFG = ${configJson};
  var SLUG = CFG.slug;

  function ensureStyles(){
    if (document.getElementById('fg-widget-styles')) return;
    var styleEl = document.createElement('style');
    styleEl.id = 'fg-widget-styles';
    styleEl.textContent = CFG.css;
    document.head.appendChild(styleEl);
  }

  function fieldLabel(field){
    if (field === 'name') return 'Имя';
    if (field === 'email') return 'Email';
    if (field === 'phone') return 'Телефон';
    return field;
  }

  function getUtm(){
    var params = new URLSearchParams(location.search);
    return {
      utmSource: params.get('utm_source') || '',
      utmMedium: params.get('utm_medium') || '',
      utmCampaign: params.get('utm_campaign') || '',
      utmContent: params.get('utm_content') || '',
      utmTerm: params.get('utm_term') || ''
    };
  }

  function buildForm(){
    var form = document.createElement('div');
    form.className = 'fg-form';

    var title = document.createElement('div');
    title.className = 'fg-title';
    title.textContent = (CFG.appearance && CFG.appearance.title) || 'Оформление заказа';
    form.appendChild(title);

    var inputs = {};
    for (var i = 0; i < CFG.visitorFields.length; i++) {
      var field = CFG.visitorFields[i];
      var wrap = document.createElement('div');
      wrap.className = 'fg-field';
      var label = document.createElement('label');
      label.textContent = fieldLabel(field);
      var input = document.createElement('input');
      input.type = field === 'email' ? 'email' : 'text';
      input.name = field;
      wrap.appendChild(label);
      wrap.appendChild(input);
      form.appendChild(wrap);
      inputs[field] = input;
    }

    var offerSelect = null;
    if (CFG.offers.length > 1) {
      var offerWrap = document.createElement('div');
      offerWrap.className = 'fg-field';
      var offerLabel = document.createElement('label');
      offerLabel.textContent = 'Предложение';
      offerSelect = document.createElement('select');
      for (var j = 0; j < CFG.offers.length; j++) {
        var offer = CFG.offers[j];
        var opt = document.createElement('option');
        opt.value = offer.offerId;
        opt.textContent = offer.title + ' — ' + offer.price + ' ' + offer.currency;
        offerSelect.appendChild(opt);
      }
      offerWrap.appendChild(offerLabel);
      offerWrap.appendChild(offerSelect);
      form.appendChild(offerWrap);
    } else if (CFG.offers.length === 1) {
      var singleOffer = CFG.offers[0];
      var infoWrap = document.createElement('div');
      infoWrap.className = 'fg-field';
      infoWrap.textContent = singleOffer.title + ' — ' + singleOffer.price + ' ' + singleOffer.currency;
      form.appendChild(infoWrap);
    }

    var submitBtn = document.createElement('button');
    submitBtn.type = 'button';
    submitBtn.className = 'fg-submit';
    submitBtn.textContent = (CFG.appearance && CFG.appearance.submitLabel) || 'Оформить заказ';
    form.appendChild(submitBtn);

    var errorEl = document.createElement('div');
    errorEl.className = 'fg-error';
    form.appendChild(errorEl);

    if (CFG.appearance && CFG.appearance.note) {
      var note = document.createElement('div');
      note.className = 'fg-note';
      note.textContent = CFG.appearance.note;
      form.appendChild(note);
    }

    submitBtn.addEventListener('click', function(){
      errorEl.className = 'fg-error';
      submitBtn.disabled = true;

      var offerId = offerSelect ? offerSelect.value : (CFG.offers[0] ? CFG.offers[0].offerId : '');
      var utm = getUtm();
      var body = new URLSearchParams({
        slug: SLUG,
        offerId: offerId,
        name: inputs.name ? inputs.name.value : '',
        email: inputs.email ? inputs.email.value : '',
        phone: inputs.phone ? inputs.phone.value : '',
        utmSource: utm.utmSource,
        utmMedium: utm.utmMedium,
        utmCampaign: utm.utmCampaign,
        utmContent: utm.utmContent,
        utmTerm: utm.utmTerm
      });

      fetch(CFG.submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })
        .then(function(res){ return res.json(); })
        .then(function(data){
          if (data && data.ok) {
            location.href = data.redirectUrl;
          } else {
            errorEl.textContent = (data && data.error) || 'Не удалось оформить заказ';
            errorEl.className = 'fg-error fg-error-visible';
            submitBtn.disabled = false;
          }
        })
        .catch(function(){
          errorEl.textContent = 'Ошибка сети, попробуйте ещё раз';
          errorEl.className = 'fg-error fg-error-visible';
          submitBtn.disabled = false;
        });
    });

    return form;
  }

  function replaceInlineAnchors(){
    var anchors = document.querySelectorAll('#' + SLUG);
    for (var i = 0; i < anchors.length; i++) {
      var anchor = anchors[i];
      anchor.innerHTML = '';
      anchor.appendChild(buildForm());
    }
  }

  function registerModal(){
    window.__formGen = window.__formGen || {};
    if (window.__formGen[SLUG]) return;
    var overlay = null;
    window.__formGen[SLUG] = {
      open: function(){
        if (overlay) return;
        overlay = document.createElement('div');
        overlay.className = 'fg-overlay';
        var modal = document.createElement('div');
        modal.className = 'fg-modal';
        var closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'fg-modal-close';
        closeBtn.textContent = '\\u00D7';
        closeBtn.addEventListener('click', function(){ window.__formGen[SLUG].close(); });
        modal.appendChild(closeBtn);
        modal.appendChild(buildForm());
        overlay.appendChild(modal);
        overlay.addEventListener('click', function(e){
          if (e.target === overlay) window.__formGen[SLUG].close();
        });
        document.body.appendChild(overlay);
      },
      close: function(){
        if (!overlay) return;
        overlay.parentNode.removeChild(overlay);
        overlay = null;
      }
    };
  }

  ensureStyles();
  replaceInlineAnchors();
  registerModal();
})();`
}

/** Тихая деградация (§2 п.1 спеки) — удалённый/несуществующий formID: страница не ломается. */
export function renderNoopJs(): string {
  return ';(function(){})();'
}
