// House extensions for the NetworkChuck Hub browser. Each extension's `code`
// runs inside the active <webview> page (via webview.executeJavaScript on
// dom-ready). Toggle them in the Extensions manager. Only ones WE make ship
// here; there's no third-party store.
//
// Every install marker, inserted element, and inserted stylesheet is tagged
// with `data-nchub-ext="<id>"` so disabling cleanly removes them. The wrap
// helper:
//   1. Guards re-install per-page (so SPA navigations don't double-stack).
//   2. Marks `body.dataset.nchubExt_<id> = "1"` for clean detection.
//   3. Defines `window.__nchubReg(id, el)` to tag insertions for unload.

export type Extension = {
  id: string;
  name: string;
  desc: string;
  code: string;
};

const wrap = (id: string, body: string) =>
  `(function(){try{var K='__nchub_${id}';if(window[K])return;window[K]=1;` +
  `function reg(el){try{el.setAttribute('data-nchub-ext','${id}')}catch(_){}return el;}` +
  `window.__nchubReg_${id}=reg;` +
  body +
  `}catch(e){}})();`;

// Universal unload script: clears the install marker, removes any element
// tagged with this extension's id, and clears the inline mutations we made
// to <body> / <html>. Toggling off injects this immediately; on the next
// page load the extension won't re-fire because we removed its marker but
// the marker check returns true for already-loaded pages; the unload
// actively removes the visible side effects from the current page too.
export const UNLOAD_TPL = (id: string) =>
  `(function(){try{window['__nchub_${id}']=0;` +
  `document.querySelectorAll('[data-nchub-ext="${id}"]').forEach(function(n){n.remove();});` +
  `if(document.body){document.body.style.zoom='';document.body.style.transform='';document.body.style.transformOrigin='';document.body.style.animation='';}` +
  `if(document.documentElement){document.documentElement.style.animation='';}` +
  `}catch(e){}})();`;

// Tag map for places we want to remember an extension introduced a class.
// Not used for unloading anymore (tag attributes do that) — kept as a hint.
export const EXTENSION_TAGS: Record<string, string> = {};

// Helper string snippets used across extensions to tag DOM insertions.
const TAG_STYLE = (id: string) => `var __s=document.createElement('style');__s.setAttribute('data-nchub-ext','${id}');`;
const APPEND_ROOT = `document.documentElement.appendChild(__s);`;

export const EXTENSIONS: Extension[] = [
  // ── Style overrides ─────────────────────────────────────────────────────
  {
    id: "comic_sans",
    name: "Comic Sans Everything",
    desc: "Replaces every font on the page with Comic Sans MS. Instantly unserious.",
    code: wrap("comic_sans",
      `${TAG_STYLE("comic_sans")}__s.textContent='*{font-family:"Comic Sans MS","Comic Sans",cursive !important}';${APPEND_ROOT}`),
  },
  {
    id: "papyrus",
    name: "Graphic Design Is My Passion",
    desc: "Sets everything in Papyrus. Designers everywhere feel a chill.",
    code: wrap("papyrus",
      `${TAG_STYLE("papyrus")}__s.textContent='*{font-family:Papyrus,fantasy !important}';${APPEND_ROOT}`),
  },
  {
    id: "monospace",
    name: "Everything Monospace",
    desc: "Pretends every page is a terminal session. Aesthetic immaculate.",
    code: wrap("monospace",
      `${TAG_STYLE("monospace")}__s.textContent='*{font-family:ui-monospace,"JetBrains Mono","Fira Code",monospace !important}';${APPEND_ROOT}`),
  },
  {
    id: "dyslexia_friendly",
    name: "Reader Mode",
    desc: "Bumps line-height, widens text columns, eases letter spacing. Easier on the eyes.",
    code: wrap("dyslexia_friendly",
      `${TAG_STYLE("dyslexia_friendly")}__s.textContent='p,li,blockquote,article{line-height:1.85 !important;letter-spacing:0.012em !important;max-width:72ch !important}';${APPEND_ROOT}`),
  },
  {
    id: "dark_force",
    name: "Force Dark",
    desc: "Slams a dark inversion filter over light sites. Crude but effective at 2am.",
    code: wrap("dark_force",
      `${TAG_STYLE("dark_force")}__s.textContent='html{filter:invert(1) hue-rotate(180deg) !important;background:#fff}img,video,picture,iframe,canvas,svg{filter:invert(1) hue-rotate(180deg) !important}';${APPEND_ROOT}`),
  },
  {
    id: "rainbow",
    name: "Rainbow Mode",
    desc: "All text cycles through the colors of a deeply unprofessional rainbow.",
    code: wrap("rainbow",
      `${TAG_STYLE("rainbow")}__s.textContent='@keyframes nchubrb{0%{filter:hue-rotate(0)}100%{filter:hue-rotate(360deg)}}body{animation:nchubrb 6s linear infinite !important}';${APPEND_ROOT}`),
  },
  {
    id: "tiny",
    name: "Everything's Tiny",
    desc: "Zooms the entire page to 60%. Squint and pretend it's a feature.",
    code: wrap("tiny", `document.body.style.zoom='0.6';`),
  },
  {
    id: "chonk",
    name: "Everything's Huge",
    desc: "Zooms the entire page to 140%. For the back row.",
    code: wrap("chonk", `document.body.style.zoom='1.4';`),
  },
  {
    id: "upside_down",
    name: "Down Under",
    desc: "Flips the whole page 180°. Reading is now a personal challenge.",
    code: wrap("upside_down",
      `document.body.style.transform='rotate(180deg)';document.body.style.transformOrigin='center';`),
  },
  {
    id: "disco",
    name: "Disco Background",
    desc: "The page background quietly throws a party behind your content.",
    code: wrap("disco",
      `${TAG_STYLE("disco")}__s.textContent='@keyframes nchubdisco{0%{background:#ff2d4a}25%{background:#ff7a2d}50%{background:#3b82f6}75%{background:#a855f7}100%{background:#ff2d4a}}html{animation:nchubdisco 3s linear infinite}';${APPEND_ROOT}`),
  },
  {
    id: "blink",
    name: "Bring Back <blink>",
    desc: "Makes links blink like it's 1999. The web was a mistake and that's beautiful.",
    code: wrap("blink",
      `${TAG_STYLE("blink")}__s.textContent='@keyframes nchubblink{50%{opacity:0}}a{animation:nchubblink 1s steps(2) infinite}';${APPEND_ROOT}`),
  },
  {
    id: "shake",
    name: "Caffeine Jitters",
    desc: "Everything trembles slightly, as if the whole page had too much coffee.",
    code: wrap("shake",
      `${TAG_STYLE("shake")}__s.textContent='@keyframes nchubshake{0%,100%{transform:translate(0,0)}25%{transform:translate(.6px,-.6px)}50%{transform:translate(-.6px,.6px)}75%{transform:translate(.6px,.6px)}}img,h1,h2,button{animation:nchubshake .2s linear infinite}';${APPEND_ROOT}`),
  },

  // ── Text rewrites ────────────────────────────────────────────────────────
  {
    id: "no_u",
    name: "No U",
    desc: "Rewrites the standalone word “no” to “no u” across the page. Devastating.",
    code: wrap("no_u",
      `function w(n){n.nodeValue=n.nodeValue.replace(/\\bno\\b/gi,'no u');}var t=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);var a=[];while(t.nextNode())a.push(t.currentNode);a.forEach(function(n){if(n.parentNode&&!/SCRIPT|STYLE|TEXTAREA|INPUT/.test(n.parentNode.nodeName))w(n);});`),
  },
  {
    id: "doge",
    name: "Such Translate",
    desc: "Sprinkles “wow”, “much”, and “very” into headings. very meme. wow.",
    code: wrap("doge",
      `var w=['wow.','much web.','very page.','so internet.'];document.querySelectorAll('h1,h2').forEach(function(h){h.textContent=h.textContent+' '+w[Math.floor(Math.random()*w.length)];});`),
  },
  {
    id: "loud",
    name: "Loud Noises",
    desc: "Randomly SHOUTS the occasional word. No reason. Adds urgency.",
    code: wrap("loud",
      `var t=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);var a=[];while(t.nextNode())a.push(t.currentNode);a.forEach(function(n){if(n.parentNode&&!/SCRIPT|STYLE|TEXTAREA|INPUT/.test(n.parentNode.nodeName)){n.nodeValue=n.nodeValue.replace(/[A-Za-z]{4,}/g,function(w){return Math.random()<0.08?w.toUpperCase():w;});}});`),
  },
  {
    id: "bleep",
    name: "Censor Bot",
    desc: "Bleeps out a small list of mild words with “▒▒▒▒”. Tastefully overzealous.",
    code: wrap("bleep",
      `var bad=/\\b(darn|heck|dang|crud|drat|blast)\\b/gi;var t=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);var a=[];while(t.nextNode())a.push(t.currentNode);a.forEach(function(n){if(n.parentNode&&!/SCRIPT|STYLE|TEXTAREA|INPUT/.test(n.parentNode.nodeName))n.nodeValue=n.nodeValue.replace(bad,'▒▒▒▒');});`),
  },
  {
    id: "smollify",
    name: "smollify",
    desc: "rewrites every heading in lowercase like its texting u. very chill.",
    code: wrap("smollify",
      `document.querySelectorAll('h1,h2,h3,h4').forEach(function(h){h.textContent=h.textContent.toLowerCase();});`),
  },

  // ── Overlays ────────────────────────────────────────────────────────────
  {
    id: "honk",
    name: "Honk Button",
    desc: "A floating goose button. It honks (a real beep). That's the whole feature.",
    code: wrap("honk",
      `var b=window.__nchubReg_honk(document.createElement('button'));b.textContent='HONK';b.style.cssText='position:fixed;z-index:2147483647;right:18px;bottom:18px;width:54px;height:54px;border-radius:50%;border:none;font-size:26px;cursor:pointer;background:#ff2d4a;box-shadow:0 0 18px #ff3355';b.onclick=function(){try{var c=new (window.AudioContext||window.webkitAudioContext)();var o=c.createOscillator();var g=c.createGain();o.type='sawtooth';o.frequency.value=180;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.2,c.currentTime);o.start();o.stop(c.currentTime+.25);}catch(e){}};document.body.appendChild(b);`),
  },
  {
    id: "snow",
    name: "Let It Snow",
    desc: "Adds gently falling snowflakes regardless of the season or the website.",
    code: wrap("snow",
      `var c=window.__nchubReg_snow(document.createElement('div'));c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483646;overflow:hidden';for(var i=0;i<40;i++){var f=document.createElement('div');f.textContent='*';var d=4+Math.random()*6;f.style.cssText='position:absolute;top:-20px;left:'+Math.random()*100+'%;font-size:'+(8+Math.random()*16)+'px;opacity:.7;animation:nchubfall '+d+'s linear '+(-Math.random()*d)+'s infinite';c.appendChild(f);}${TAG_STYLE("snow")}__s.textContent='@keyframes nchubfall{to{transform:translateY(110vh)}}';${APPEND_ROOT}document.body.appendChild(c);`),
  },
  {
    id: "cat_cursor",
    name: "Cat Cursor",
    desc: "A cat follows your cursor everywhere. It is not housebroken.",
    code: wrap("cat_cursor",
      `var c=window.__nchubReg_cat_cursor(document.createElement('div'));c.textContent='=^..^=';c.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;font-size:22px;transition:transform .08s';document.body.appendChild(c);document.addEventListener('mousemove',function(e){c.style.transform='translate('+(e.clientX+8)+'px,'+(e.clientY+8)+'px)';});`),
  },
  {
    id: "matrix",
    name: "Enter The Matrix",
    desc: "A faint green digital-rain overlay. You are now technically a hacker.",
    code: wrap("matrix",
      `var cv=window.__nchubReg_matrix(document.createElement('canvas'));cv.style.cssText='position:fixed;inset:0;z-index:2147483645;pointer-events:none;opacity:.18';document.body.appendChild(cv);var x=cv.getContext('2d');function R(){cv.width=innerWidth;cv.height=innerHeight;}R();var d=[];for(var i=0;i<Math.floor(innerWidth/14);i++)d[i]=1;setInterval(function(){x.fillStyle='rgba(0,0,0,.06)';x.fillRect(0,0,cv.width,cv.height);x.fillStyle='#0f0';x.font='14px monospace';for(var i=0;i<d.length;i++){var c=String.fromCharCode(0x30a0+Math.random()*96);x.fillText(c,i*14,d[i]*14);if(d[i]*14>cv.height&&Math.random()>.975)d[i]=0;d[i]++;}},60);`),
  },
  {
    id: "clippy",
    name: "Not-Clippy",
    desc: "A corner assistant offers unsolicited, unhelpful tips. Dismiss to feel free.",
    code: wrap("clippy",
      `var tips=['It looks like you are browsing. Want help browsing?','Have you tried turning the website off and on again?','Pro tip: you are using a browser right now.','I noticed you have eyes. Use them to read this site.'];var b=window.__nchubReg_clippy(document.createElement('div'));b.style.cssText='position:fixed;right:18px;bottom:84px;z-index:2147483647;max-width:220px;background:#111114;color:#e8e8ee;border:1px solid #ff5577;border-radius:10px;padding:10px 12px;font:13px sans-serif;box-shadow:0 0 18px #ff335555';b.innerHTML='TIP: '+tips[Math.floor(Math.random()*tips.length)]+'<br><span style="cursor:pointer;color:#ff5577;font-size:11px">[dismiss]</span>';b.querySelector('span').onclick=function(){b.remove();};document.body.appendChild(b);`),
  },
  {
    id: "thanos",
    name: "The Snap",
    desc: "Adds a button that fades out a random half of the page's elements. Balance.",
    code: wrap("thanos",
      `var b=window.__nchubReg_thanos(document.createElement('button'));b.textContent='snap';b.style.cssText='position:fixed;left:18px;bottom:18px;z-index:2147483647;padding:8px 12px;border:none;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer;font:13px sans-serif';b.onclick=function(){document.querySelectorAll('img,p,li,div').forEach(function(el){if(Math.random()<.5){el.style.transition='opacity 1.5s';el.style.opacity='0';}});};document.body.appendChild(b);`),
  },
  {
    id: "coffee",
    name: "Coffee Reminder",
    desc: "Every so often, a tiny reminder that you should be drinking more coffee.",
    code: wrap("coffee",
      `function ping(){if(!window.__nchub_coffee)return;var t=document.createElement('div');t.setAttribute('data-nchub-ext','coffee');t.textContent='coffee?';t.style.cssText='position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:2147483647;background:#111114;color:#ff7a2d;border:1px solid #ff7a2d;border-radius:20px;padding:6px 14px;font:13px sans-serif;box-shadow:0 0 16px #ff7a2d55;transition:opacity .5s';document.body.appendChild(t);setTimeout(function(){t.style.opacity='0';setTimeout(function(){t.remove();},600);},2600);}ping();setInterval(ping,45000);`),
  },

  // ── Real utilities ───────────────────────────────────────────────────────
  {
    id: "reading_time",
    name: "Reading Time",
    desc: "Estimates how long the current article takes to read and tags it under the headline.",
    code: wrap("reading_time",
      `var art=document.querySelector('article,main,[role=main]')||document.body;var text=(art.innerText||'').trim();var words=text?text.split(/\\s+/).length:0;if(words<150)return;var min=Math.max(1,Math.round(words/220));var h=document.querySelector('h1');var tag=window.__nchubReg_reading_time(document.createElement('div'));tag.textContent='◆ '+min+' min read · '+words+' words';tag.style.cssText='font:12px ui-monospace,monospace;color:#ff7a2d;letter-spacing:1px;margin:6px 0 14px;opacity:.9';if(h&&h.parentNode){h.parentNode.insertBefore(tag,h.nextSibling);}else{document.body.insertBefore(tag,document.body.firstChild);}`),
  },
  {
    id: "anti_paywall_text",
    name: "Strip Sticky Overlays",
    desc: "Removes fixed-position overlays that block content (cookie banners, signup walls, etc).",
    code: wrap("anti_paywall_text",
      `function strip(){var sels='[class*="overlay" i],[class*="paywall" i],[class*="signup" i],[class*="newsletter" i],[id*="cookie" i],[class*="cookie-banner" i]';document.querySelectorAll(sels).forEach(function(el){var cs=getComputedStyle(el);if(cs.position==='fixed'||cs.position==='sticky'){el.remove();}});document.documentElement.style.overflow='auto';document.body.style.overflow='auto';}strip();var obs=new MutationObserver(strip);obs.observe(document.body,{childList:true,subtree:true});window.__nchub_anti_paywall_text_obs=obs;`),
  },
  {
    id: "highlight_external_links",
    name: "Mark External Links",
    desc: "Tags every external link with a small ↗ so you know what's leaving the site.",
    code: wrap("highlight_external_links",
      `var here=location.hostname;document.querySelectorAll('a[href]').forEach(function(a){try{var u=new URL(a.href,location.href);if(u.hostname&&u.hostname!==here&&!a.dataset.nchubExtMarked){a.dataset.nchubExtMarked='1';a.setAttribute('data-nchub-ext','highlight_external_links');var s=document.createElement('sup');s.textContent=' ↗';s.style.color='#ff7a2d';s.style.fontSize='10px';s.setAttribute('data-nchub-ext','highlight_external_links');a.appendChild(s);}}catch(e){}});`),
  },
  {
    id: "wider_lines",
    name: "Wider Lines",
    desc: "Caps very long line lengths at 80 characters so dense pages stop feeling like spreadsheets.",
    code: wrap("wider_lines",
      `${TAG_STYLE("wider_lines")}__s.textContent='p,article,main,li,blockquote{max-width:80ch !important}';${APPEND_ROOT}`),
  },
  {
    id: "kill_motion",
    name: "Kill Motion",
    desc: "Disables CSS animations and transitions site-wide. Calmer browsing.",
    code: wrap("kill_motion",
      `${TAG_STYLE("kill_motion")}__s.textContent='*,*::before,*::after{animation:none !important;transition:none !important;scroll-behavior:auto !important}';${APPEND_ROOT}`),
  },
  {
    id: "auto_pause_video",
    name: "Auto-Pause Video",
    desc: "Pauses every <video> on the page on load. Stops surprise autoplay everywhere.",
    code: wrap("auto_pause_video",
      `function pauseAll(){document.querySelectorAll('video').forEach(function(v){try{v.pause();v.removeAttribute('autoplay');}catch(e){}});}pauseAll();var obs=new MutationObserver(pauseAll);obs.observe(document.body,{childList:true,subtree:true});window.__nchub_auto_pause_video_obs=obs;`),
  },
  {
    id: "domain_badge",
    name: "Domain Badge",
    desc: "Pins a small badge with the current domain in the corner. Handy when tabs lie about where you are.",
    code: wrap("domain_badge",
      `var b=window.__nchubReg_domain_badge(document.createElement('div'));b.textContent=location.hostname;b.style.cssText='position:fixed;left:8px;top:8px;z-index:2147483647;background:rgba(10,10,14,.85);color:#ff5577;border:1px solid #ff557755;border-radius:6px;padding:3px 8px;font:11px ui-monospace,monospace;letter-spacing:1px;pointer-events:none;box-shadow:0 0 10px rgba(255,87,119,.3)';document.body.appendChild(b);`),
  },
  {
    id: "scroll_progress",
    name: "Scroll Progress",
    desc: "A thin pink bar at the top of the page showing how far you've scrolled.",
    code: wrap("scroll_progress",
      `var bar=window.__nchubReg_scroll_progress(document.createElement('div'));bar.style.cssText='position:fixed;left:0;top:0;height:3px;background:linear-gradient(90deg,#ff2d4a,#ff7a2d);z-index:2147483647;width:0;box-shadow:0 0 8px #ff2d4a';document.body.appendChild(bar);function upd(){var h=document.documentElement.scrollHeight-window.innerHeight;var p=h>0?(window.scrollY/h)*100:0;bar.style.width=p+'%';}upd();window.addEventListener('scroll',upd,{passive:true});window.addEventListener('resize',upd);`),
  },
  {
    id: "word_count",
    name: "Word Count",
    desc: "Counts selected text and shows the count in the corner. Live and unobtrusive.",
    code: wrap("word_count",
      `var b=window.__nchubReg_word_count(document.createElement('div'));b.style.cssText='position:fixed;right:8px;top:8px;z-index:2147483647;background:rgba(10,10,14,.85);color:#22d3ee;border:1px solid #22d3ee55;border-radius:6px;padding:3px 8px;font:11px ui-monospace,monospace;display:none';document.body.appendChild(b);document.addEventListener('selectionchange',function(){var s=document.getSelection();var t=s?s.toString():'';if(t.trim()){var w=t.trim().split(/\\s+/).length;b.textContent=w+' word'+(w===1?'':'s')+' · '+t.length+' char';b.style.display='block';}else{b.style.display='none';}});`),
  },
  {
    id: "huh_translate",
    name: "Huh?",
    desc: "Highlight any word, then click the floating 'huh?' button to look it up in a new tab.",
    code: wrap("huh_translate",
      `var b=window.__nchubReg_huh_translate(document.createElement('button'));b.textContent='huh?';b.style.cssText='position:fixed;z-index:2147483647;display:none;background:#111114;color:#ff5577;border:1px solid #ff5577;border-radius:8px;padding:4px 10px;font:12px ui-monospace,monospace;cursor:pointer;box-shadow:0 0 12px #ff337755';document.body.appendChild(b);function upd(){var s=document.getSelection();var t=s?s.toString().trim():'';if(t&&t.length<60){var r=s.getRangeAt(0).getBoundingClientRect();b.style.left=Math.max(10,r.left)+'px';b.style.top=(r.bottom+window.scrollY+8)+'px';b.style.display='block';b.dataset.q=t;}else{b.style.display='none';}}document.addEventListener('selectionchange',upd);b.onclick=function(){var q=b.dataset.q||'';if(q)window.open('https://duckduckgo.com/?q='+encodeURIComponent('define '+q),'_blank','noopener');};`),
  },
];

const LS_KEY = "nchub.extensions.enabled.v1";
const subs = new Set<(ids: Set<string>) => void>();

export function loadEnabled(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

export function saveEnabled(ids: Set<string>): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify([...ids])); } catch { /* ignore */ }
  subs.forEach((fn) => fn(new Set(ids)));
}

export function subscribeEnabled(fn: (ids: Set<string>) => void): () => void {
  subs.add(fn);
  return () => subs.delete(fn);
}
