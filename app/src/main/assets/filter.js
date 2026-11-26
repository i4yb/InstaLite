(function () {
  if (window.__igLite) return;
  window.__igLite = true;

  var BLOCKED = /^\/(reels?|explore)(\/|$)/;
  var POST_SEL = 'article,[data-pagelet^="FeedUnit"],[aria-label="Like"],[aria-label="Unlike"],a[href^="/p/"],time';

  // ---- CSS: applies instantly, before first paint ----
  var css = [
    'a[href^="/reels"]', 'a[href^="/reel/"]', 'a[href^="/explore"]',
    'input[placeholder="Search"]',
    'html[data-ig-home="1"] article',
    'html[data-ig-home="1"] [data-pagelet^="FeedUnit"]',
    'html[data-ig-home="1"] [role="feed"]',
    'html[data-ig-home="1"] [data-ig-feed]'
  ].join(',') + '{display:none!important}';
  var style = document.createElement('style');
  style.textContent = css;
  function attachStyle() {
    if (!style.isConnected) (document.head || document.documentElement).appendChild(style);
  }

  function guard() {
    var p = location.pathname;
    if (BLOCKED.test(p)) { location.replace('/'); return false; }
    document.documentElement.setAttribute('data-ig-home', p === '/' ? '1' : '0');
    return true;
  }

  function hideNavIcons() {
    var sel = 'svg[aria-label="Reels"],svg[aria-label="Explore"],svg[aria-label="Search"]';
    document.querySelectorAll(sel).forEach(function (svg) {
      var host = svg.closest('a,button,[role="button"],[role="link"]');
      if (host) host.style.setProperty('display', 'none', 'important');
    });
  }

  // ---- Stories tray detection (tries several signals) ----
  function lca(els) {
    var node = els[0].parentElement;
    while (node && !els.every(function (e) { return node.contains(e); })) node = node.parentElement;
    return node;
  }
  function findTray() {
    var t = document.querySelector('[data-pagelet="story_tray"]');
    if (t) return t;
    var sets = ['[role="menuitem"]', '[aria-label^="Story by"]', 'a[href^="/stories/"]'];
    for (var i = 0; i < sets.length; i++) {
      var items = Array.prototype.filter.call(document.querySelectorAll(sets[i]), function (el) {
        return !el.closest('header,nav,article,[role="dialog"]');
      });
      if (items.length >= 2) { var r = lca(items); if (r && r !== document.body) return r; }
    }
    return null;
  }

  // ---- Hide the posts' container, leave the tray (and anything else) alone ----
  function trimFeed() {
    if (location.pathname !== '/') return;
    var markers = document.querySelectorAll(POST_SEL);
    if (!markers.length) return;
    var tray = findTray();
    markers.forEach(function (m) {
      if (tray && (tray.contains(m) || m.contains(tray))) return;
      var node = m;
      if (tray) {
        // climb until the parent also holds the tray -> node = the whole feed branch
        while (node.parentElement && !node.parentElement.contains(tray) && node.parentElement !== document.body) node = node.parentElement;
      } else {
        // no tray found: climb to the first big block (= one post)
        while (node.parentElement && node.offsetHeight < 350 && node.parentElement !== document.body) node = node.parentElement;
      }
      if (/^(MAIN|BODY|HTML|NAV|HEADER)$/.test(node.tagName)) return;
      if (node.querySelector('nav,[role="navigation"]')) return;
      node.setAttribute('data-ig-feed', '1');
    });
  }

  var pending = false;
  function run() {
    pending = false;
    attachStyle();
    if (!guard()) return;
    hideNavIcons();
    trimFeed();
  }
  function schedule() {
    if (!pending) { pending = true; requestAnimationFrame(run); }
  }

  ['pushState', 'replaceState'].forEach(function (k) {
    var orig = history[k];
    history[k] = function () { var r = orig.apply(this, arguments); guard(); schedule(); return r; };
  });
  window.addEventListener('popstate', schedule);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });

  // ---- Debug helper: outline of the page (hold Volume Up in the app to copy it) ----
  window.__igDump = function () {
    var out = [];
    (function walk(el, d) {
      if (d > 16 || out.length > 300) return;
      var tag = el.tagName.toLowerCase(), a = [tag];
      ['role', 'aria-label', 'data-pagelet', 'href'].forEach(function (k) {
        var v = el.getAttribute(k); if (v) a.push(k + '=' + v.slice(0, 40));
      });
      var kids = el.children.length;
      if (a.length > 1 || kids > 1 || d < 4)
        out.push(new Array(d + 1).join(' ') + a.join(' ') + ' [' + kids + ']' + (el.hasAttribute('data-ig-feed') ? ' <HIDDEN>' : ''));
      if (tag === 'svg') return;
      for (var i = 0; i < kids; i++) walk(el.children[i], d + 1);
    })(document.body, 0);
    return location.pathname + '\n' + out.join('\n');
  };

  run();
})();
