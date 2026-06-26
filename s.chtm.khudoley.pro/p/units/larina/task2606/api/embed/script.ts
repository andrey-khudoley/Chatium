import { getFullUrl } from '../../config/routes'
import { writeServerLog } from '../../lib/logger.lib'

const LOG_PATH = 'api/embed/script'

/**
 * GET / — отдаёт встраиваемый JS-скрипт для GetCourse-страниц.
 * БЕЗ авторизации, БЕЗ @shared-route (нет .run() на клиенте).
 * Возвращает rawHttpBody с Content-Type: application/javascript.
 */
export const getEmbedScriptRoute = app.get('/', async (ctx, req) => {
  // Абсолютный URL ingest через платформенный API (без доверия Host-заголовку)
  const ingestUrl = ctx.account.url(getFullUrl('/api/ingest'))

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] entry`,
    payload: { ingestUrl }
  })

  const clientScript = `(function() {
  var INGEST_URL = ${JSON.stringify(ingestUrl)};

  function buildAndSend() {
    try {
      var visitorId = String(window.accountUserId != null ? window.accountUserId : '');
      var ip = String(window.requestIp != null ? window.requestIp : '');
      var url = location.origin + location.pathname;
      var params = location.search;

      // info: плоский объект из window-переменных
      var info = {};
      var windowKeys = ['isSublogined', 'accountId', 'gcSessionId', 'controllerId', 'actionId', 'nowTime', 'dateOffset'];
      for (var i = 0; i < windowKeys.length; i++) {
        var k = windowKeys[i];
        var v = window[k];
        if (v !== undefined) {
          if (k === 'nowTime' && v instanceof Date) {
            info[k] = v.toISOString();
          } else {
            info[k] = v;
          }
        }
      }
      // userInfo: развёртываем в ключи вида userInfo.isAdmin
      var ui = window.userInfo;
      if (ui && typeof ui === 'object') {
        var uiKeys = Object.keys(ui);
        for (var j = 0; j < uiKeys.length; j++) {
          info['userInfo.' + uiKeys[j]] = ui[uiKeys[j]];
        }
      }

      // dom: клон documentElement без script/style/комментариев
      var dom = '';
      try {
        var clone = document.documentElement.cloneNode(true);
        // Удаляем script и style
        var unwanted = clone.querySelectorAll('script, style');
        for (var n = 0; n < unwanted.length; n++) {
          unwanted[n].parentNode && unwanted[n].parentNode.removeChild(unwanted[n]);
        }
        // Удаляем узлы-комментарии через TreeWalker
        var walker = document.createTreeWalker(clone, 128 /* NodeFilter.SHOW_COMMENT */, null);
        var comments = [];
        var node;
        while ((node = walker.nextNode())) {
          comments.push(node);
        }
        for (var c = 0; c < comments.length; c++) {
          comments[c].parentNode && comments[c].parentNode.removeChild(comments[c]);
        }
        dom = clone.outerHTML;
      } catch (domErr) {
        dom = '';
      }

      var payload = {
        visitorId: visitorId,
        ip: ip,
        url: url,
        params: params,
        info: info,
        dom: dom
      };

      // Без keepalive: его лимит тела ~64 КБ молча отбрасывал бы крупный DOM.
      fetch(INGEST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload),
        mode: 'cors'
      }).catch(function() {});
    } catch (e) {
      // silent
    }
  }

  // Снимаем DOM после полной загрузки И «успокоения» динамики (AJAX/React/виджеты GetCourse
  // догружают контент уже ПОСЛЕ DOMContentLoaded). Иначе в снимок попадает ранний скелет,
  // а не то, что реально на экране у пользователя.
  function settleThenSend() {
    var QUIET_MS = 1500; // снять после паузы в мутациях DOM
    var MAX_WAIT_MS = 12000; // жёсткий потолок ожидания от момента load
    var done = false;
    var quietTimer = null;
    var observer = null;
    function finish() {
      if (done) return;
      done = true;
      try {
        if (observer) observer.disconnect();
      } catch (e) {}
      if (quietTimer) clearTimeout(quietTimer);
      buildAndSend();
    }
    function bump() {
      if (done) return;
      if (quietTimer) clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, QUIET_MS);
    }
    try {
      observer = new MutationObserver(bump);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });
    } catch (e) {}
    bump(); // старт таймера тишины на случай отсутствия мутаций
    setTimeout(finish, MAX_WAIT_MS); // гарантированный захват не позже потолка
  }

  function start() {
    if (document.readyState === 'complete') {
      settleThenSend();
    } else {
      window.addEventListener('load', settleThenSend);
    }
  }

  start();
})();`

  await writeServerLog(ctx, {
    severity: 6,
    message: `[${LOG_PATH}] exit`,
    payload: { scriptLen: clientScript.length }
  })

  return {
    statusCode: 200,
    rawHttpBody: clientScript,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      // Короткий кэш: при доработке скрипта обновление доходит до встроенных страниц за ~1 мин,
      // а не за час. Скрипт крошечный — частая ревалидация не нагружает.
      'Cache-Control': 'public, max-age=60'
    }
  }
})

export default getEmbedScriptRoute
