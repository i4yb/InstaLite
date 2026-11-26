(function () {
  if (window.__igLite) return;
  window.__igLite = true;

  var BLOCKED = /^\/(reels?|explore)(\/|$)/;

  // ---- CSS: instant, applies before first paint ----
  var css = [
    'a[href^="/reels"]', 'a[href^="/reel/"]', 'a[href^="/explore"]',
    'input[placeholder="Search"]',
    'html[data-ig-home="1"] article',      // feed posts (home only)
    'html[data-ig-home="1"] [data-ig-feed]' // everything under the stories tray (home only)
  ].join(',') + '{display:none!important}';
  var style = document.createElement('style');
  style.textContent = css;

  function attachStyle() {
    if (!style.isConnected) (document.head || document.documentElement).appendChild(style);
  }

  // ---- Redirect away from reels/explore (also for in-app navigation) ----
  function guard() {
    var p = location.pathname;
    if (BLOCKED.test(p)) { location.replace('/'); return false; }
    document.documentElement.setAttribute('data-ig-home', p === '/' ? '1' : '0');
    return true;
  }

  // ---- Hide icon buttons that have no href (desktop-style sidebar) ----
  function hideNavIcons() {
    var sel = 'svg[aria-label="Reels"],svg[aria-label="Explore"],svg[aria-label="Search"]';
    document.querySelectorAll(sel).forEach(function (svg) {
      var host = svg.closest('a,button,[role="button"],[role="link"]');
      if (host) host.style.setProperty('display', 'none', 'important');
    });
  }

  // ---- Keep the stories tray, hide whatever comes after it ----
  function trimFeed() {
    if (location.pathname !== '/') return;
    var tray = document.querySelector('main [role="menu"], main [role="listbox"]');
    if (!tray) return;
    var node = tray;
    while (node.parentElement && node.parentElement.tagName !== 'MAIN') {
      for (var s = node.nextElementSibling; s; s = s.nextElementSibling) s.setAttribute('data-ig-feed', '1');
      node = node.parentElement;
    }
    for (var s2 = node.nextElementSibling; s2; s2 = s2.nextElementSibling) s2.setAttribute('data-ig-feed', '1');
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

  // Instagram is a single-page app: re-run on DOM changes and route changes
  ['pushState', 'replaceState'].forEach(function (k) {
    var orig = history[k];
    history[k] = function () { var r = orig.apply(this, arguments); guard(); schedule(); return r; };
  });
  window.addEventListener('popstate', schedule);
  new MutationObserver(schedule).observe(document.documentElement, { childList: true, subtree: true });

  run();
})();
