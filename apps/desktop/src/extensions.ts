// House extensions for the NetworkChuck Hub browser. Each extension's `code`
// runs inside the active <webview> page (via webview.executeJavaScript on
// dom-ready). They're deliberately dumb/funny — toggle them in the Extensions
// manager. Only ones WE make ship here; there's no third-party store.

export type Extension = {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  code: string;
};

// Each `code` body is wrapped in an IIFE guarded so it only applies once.
const wrap = (id: string, body: string) =>
  `(function(){try{var K='__nchub_${id}';if(window[K])return;window[K]=1;${body}}catch(e){}})();`;

export const EXTENSIONS: Extension[] = [
  {
    id: "comic_sans",
    name: "Comic Sans Everything",
    emoji: "🖍️",
    desc: "Replaces every font on the page with Comic Sans MS. Instantly unserious.",
    code: wrap(
      "comic_sans",
      `var s=document.createElement('style');s.textContent='*{font-family:"Comic Sans MS","Comic Sans",cursive !important}';document.documentElement.appendChild(s);`
    ),
  },
  {
    id: "no_u",
    name: "No U",
    emoji: "🔁",
    desc: "Rewrites the standalone word “no” to “no u” across the page. Devastating.",
    code: wrap(
      "no_u",
      `function w(n){n.nodeValue=n.nodeValue.replace(/\\bno\\b/gi,'no u');}var t=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);var a=[];while(t.nextNode())a.push(t.currentNode);a.forEach(function(n){if(n.parentNode&&!/SCRIPT|STYLE|TEXTAREA|INPUT/.test(n.parentNode.nodeName))w(n);});`
    ),
  },
  {
    id: "honk",
    name: "Honk Button",
    emoji: "🪿",
    desc: "A floating goose button. It honks (a real beep). That's the whole feature.",
    code: wrap(
      "honk",
      `var b=document.createElement('button');b.textContent='🪿';b.style.cssText='position:fixed;z-index:2147483647;right:18px;bottom:18px;width:54px;height:54px;border-radius:50%;border:none;font-size:26px;cursor:pointer;background:#ff2d4a;box-shadow:0 0 18px #ff3355';b.onclick=function(){try{var c=new (window.AudioContext||window.webkitAudioContext)();var o=c.createOscillator();var g=c.createGain();o.type='sawtooth';o.frequency.value=180;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.2,c.currentTime);o.start();o.stop(c.currentTime+.25);}catch(e){}};document.body.appendChild(b);`
    ),
  },
  {
    id: "rainbow",
    name: "Rainbow Mode",
    emoji: "🌈",
    desc: "All text cycles through the colors of a deeply unprofessional rainbow.",
    code: wrap(
      "rainbow",
      `var s=document.createElement('style');s.textContent='@keyframes nchubrb{0%{filter:hue-rotate(0)}100%{filter:hue-rotate(360deg)}}body{animation:nchubrb 6s linear infinite}';document.documentElement.appendChild(s);`
    ),
  },
  {
    id: "snow",
    name: "Let It Snow",
    emoji: "❄️",
    desc: "Adds gently falling snowflakes regardless of the season or the website.",
    code: wrap(
      "snow",
      `var c=document.createElement('div');c.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483646;overflow:hidden';for(var i=0;i<40;i++){var f=document.createElement('div');f.textContent='❄';var d=4+Math.random()*6;f.style.cssText='position:absolute;top:-20px;left:'+Math.random()*100+'%;font-size:'+(8+Math.random()*16)+'px;opacity:.7;animation:nchubfall '+d+'s linear '+(-Math.random()*d)+'s infinite';c.appendChild(f);}var s=document.createElement('style');s.textContent='@keyframes nchubfall{to{transform:translateY(110vh)}}';document.documentElement.appendChild(s);document.body.appendChild(c);`
    ),
  },
  {
    id: "tiny",
    name: "Everything's Tiny",
    emoji: "🔬",
    desc: "Zooms the entire page to 60%. Squint and pretend it's a feature.",
    code: wrap("tiny", `document.body.style.zoom='0.6';`),
  },
  {
    id: "chonk",
    name: "Everything's Huge",
    emoji: "🔍",
    desc: "Zooms the entire page to 140%. For the back row.",
    code: wrap("chonk", `document.body.style.zoom='1.4';`),
  },
  {
    id: "upside_down",
    name: "Down Under",
    emoji: "🙃",
    desc: "Flips the whole page 180°. Reading is now a personal challenge.",
    code: wrap(
      "upside_down",
      `document.body.style.transform='rotate(180deg)';document.body.style.transformOrigin='center';`
    ),
  },
  {
    id: "disco",
    name: "Disco Background",
    emoji: "🪩",
    desc: "The page background quietly throws a party behind your content.",
    code: wrap(
      "disco",
      `var s=document.createElement('style');s.textContent='@keyframes nchubdisco{0%{background:#ff2d4a}25%{background:#ff7a2d}50%{background:#3b82f6}75%{background:#a855f7}100%{background:#ff2d4a}}html{animation:nchubdisco 3s linear infinite}';document.documentElement.appendChild(s);`
    ),
  },
  {
    id: "cat_cursor",
    name: "Cat Cursor",
    emoji: "🐱",
    desc: "A cat follows your cursor everywhere. It is not housebroken.",
    code: wrap(
      "cat_cursor",
      `var c=document.createElement('div');c.textContent='🐱';c.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;font-size:22px;transition:transform .08s';document.body.appendChild(c);document.addEventListener('mousemove',function(e){c.style.transform='translate('+(e.clientX+8)+'px,'+(e.clientY+8)+'px)';});`
    ),
  },
  {
    id: "bleep",
    name: "Censor Bot",
    emoji: "📢",
    desc: "Bleeps out a small list of mild words with “▒▒▒▒”. Tastefully overzealous.",
    code: wrap(
      "bleep",
      `var bad=/\\b(darn|heck|dang|crud|drat|blast)\\b/gi;var t=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);var a=[];while(t.nextNode())a.push(t.currentNode);a.forEach(function(n){if(n.parentNode&&!/SCRIPT|STYLE|TEXTAREA|INPUT/.test(n.parentNode.nodeName))n.nodeValue=n.nodeValue.replace(bad,'▒▒▒▒');});`
    ),
  },
  {
    id: "shake",
    name: "Caffeine Jitters",
    emoji: "☕",
    desc: "Everything trembles slightly, as if the whole page had too much coffee.",
    code: wrap(
      "shake",
      `var s=document.createElement('style');s.textContent='@keyframes nchubshake{0%,100%{transform:translate(0,0)}25%{transform:translate(.6px,-.6px)}50%{transform:translate(-.6px,.6px)}75%{transform:translate(.6px,.6px)}}img,h1,h2,button{animation:nchubshake .2s linear infinite}';document.documentElement.appendChild(s);`
    ),
  },
  {
    id: "doge",
    name: "Such Translate",
    emoji: "🐕",
    desc: "Sprinkles “wow”, “much”, and “very” into headings. very meme. wow.",
    code: wrap(
      "doge",
      `var w=['wow.','much web.','very page.','so internet.'];document.querySelectorAll('h1,h2').forEach(function(h){h.textContent=h.textContent+' '+w[Math.floor(Math.random()*w.length)];});`
    ),
  },
  {
    id: "emojify",
    name: "Emojify",
    emoji: "😀",
    desc: "Quietly tacks an emoji onto common words. Communication, improved.",
    code: wrap(
      "emojify",
      `var m={'fire':'🔥','love':'❤️','money':'💰','time':'⏰','code':'💻','coffee':'☕','dog':'🐶','cat':'🐱'};var t=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);var a=[];while(t.nextNode())a.push(t.currentNode);a.forEach(function(n){if(n.parentNode&&!/SCRIPT|STYLE|TEXTAREA|INPUT/.test(n.parentNode.nodeName)){Object.keys(m).forEach(function(k){n.nodeValue=n.nodeValue.replace(new RegExp('\\\\b'+k+'\\\\b','gi'),k+' '+m[k]);});}});`
    ),
  },
  {
    id: "matrix",
    name: "Enter The Matrix",
    emoji: "💊",
    desc: "A faint green digital-rain overlay. You are now technically a hacker.",
    code: wrap(
      "matrix",
      `var cv=document.createElement('canvas');cv.style.cssText='position:fixed;inset:0;z-index:2147483645;pointer-events:none;opacity:.18';document.body.appendChild(cv);var x=cv.getContext('2d');function R(){cv.width=innerWidth;cv.height=innerHeight;}R();var d=[];for(var i=0;i<Math.floor(innerWidth/14);i++)d[i]=1;setInterval(function(){x.fillStyle='rgba(0,0,0,.06)';x.fillRect(0,0,cv.width,cv.height);x.fillStyle='#0f0';x.font='14px monospace';for(var i=0;i<d.length;i++){var c=String.fromCharCode(0x30a0+Math.random()*96);x.fillText(c,i*14,d[i]*14);if(d[i]*14>cv.height&&Math.random()>.975)d[i]=0;d[i]++;}},60);`
    ),
  },
  {
    id: "clippy",
    name: "Not-Clippy",
    emoji: "📎",
    desc: "A corner assistant offers unsolicited, unhelpful tips. Dismiss to feel free.",
    code: wrap(
      "clippy",
      `var tips=['It looks like you are browsing. Want help browsing?','Have you tried turning the website off and on again?','Pro tip: you are using a browser right now.','I noticed you have eyes. Use them to read this site.'];var b=document.createElement('div');b.style.cssText='position:fixed;right:18px;bottom:84px;z-index:2147483647;max-width:220px;background:#111114;color:#e8e8ee;border:1px solid #ff5577;border-radius:10px;padding:10px 12px;font:13px sans-serif;box-shadow:0 0 18px #ff335555';b.innerHTML='📎 '+tips[Math.floor(Math.random()*tips.length)]+'<br><span style="cursor:pointer;color:#ff5577;font-size:11px">[dismiss]</span>';b.querySelector('span').onclick=function(){b.remove();};document.body.appendChild(b);`
    ),
  },
  {
    id: "thanos",
    name: "The Snap",
    emoji: "🫰",
    desc: "Adds a button that fades out a random half of the page's elements. Balance.",
    code: wrap(
      "thanos",
      `var b=document.createElement('button');b.textContent='🫰 snap';b.style.cssText='position:fixed;left:18px;bottom:18px;z-index:2147483647;padding:8px 12px;border:none;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer;font:13px sans-serif';b.onclick=function(){document.querySelectorAll('img,p,li,div').forEach(function(el){if(Math.random()<.5){el.style.transition='opacity 1.5s';el.style.opacity='0';}});};document.body.appendChild(b);`
    ),
  },
  {
    id: "papyrus",
    name: "Graphic Design Is My Passion",
    emoji: "🗒️",
    desc: "Sets everything in Papyrus. Designers everywhere feel a chill.",
    code: wrap(
      "papyrus",
      `var s=document.createElement('style');s.textContent='*{font-family:Papyrus,fantasy !important}';document.documentElement.appendChild(s);`
    ),
  },
  {
    id: "blink",
    name: "Bring Back <blink>",
    emoji: "✨",
    desc: "Makes links blink like it's 1999. The web was a mistake and that's beautiful.",
    code: wrap(
      "blink",
      `var s=document.createElement('style');s.textContent='@keyframes nchubblink{50%{opacity:0}}a{animation:nchubblink 1s steps(2) infinite}';document.documentElement.appendChild(s);`
    ),
  },
  {
    id: "coffee",
    name: "Coffee Reminder",
    emoji: "☕",
    desc: "Every so often, a tiny reminder that you should be drinking more coffee.",
    code: wrap(
      "coffee",
      `function ping(){var t=document.createElement('div');t.textContent='☕ coffee?';t.style.cssText='position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:2147483647;background:#111114;color:#ff7a2d;border:1px solid #ff7a2d;border-radius:20px;padding:6px 14px;font:13px sans-serif;box-shadow:0 0 16px #ff7a2d55;transition:opacity .5s';document.body.appendChild(t);setTimeout(function(){t.style.opacity='0';setTimeout(function(){t.remove();},600);},2600);}ping();setInterval(ping,45000);`
    ),
  },
];

const LS_KEY = "nchub.extensions.enabled.v1";

export function loadEnabled(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

export function saveEnabled(ids: Set<string>): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}
