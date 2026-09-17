const CARDS = window.CARDS || [];
let current = 0;
let selected = new Set();
let currentCategory = "全部";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

function esc(s){
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[m]);
}

function frontHtml(c){
  if(c.image){
    return '<img class="front-image" src="' + c.image + '" alt="' + esc(c.phrase) + '">';
  }
  const lines = c.lines.map(esc).join("<br>");
  const accent = c.accent ? '<div class="fg-red">' + esc(c.accent) + '</div>' : "";
  return '<div class="front-generated">' +
    '<div class="papergrain"></div>' +
    '<div class="fg-head"><div class="fg-phrase">' + lines + '</div><div class="fg-kana">' + c.kana + '</div></div>' +
    '<div class="fg-art"><div class="fg-icon">' + c.icon + '</div><div class="fg-caption">' + esc(c.caption || "") + '</div>' + accent + '</div>' +
  '</div>';
}

function renderViewer(){
  const c = CARDS[current];
  $("#counter").textContent = String(current + 1).padStart(2,"0") + " / " + CARDS.length;
  $("#card3d").classList.remove("flipped");
  $("#card3d").innerHTML =
    '<article class="card-face card-front">' + frontHtml(c) + '</article>' +
    '<article class="card-face card-back">' +
      '<div class="papergrain"></div>' +
      '<div class="back-kana">' + c.kana + '</div>' +
      '<div class="back-phrase">' + esc(c.phrase) + '</div>' +
      '<span class="back-label">解説</span>' +
      '<p class="back-text">' + esc(c.explanation) + '</p>' +
      '<div class="tags">' +
        c.tags.map((t) => '<span class="tag">#' + esc(t) + '</span>').join("") +
        '<span class="tag">#' + esc(c.category) + '</span>' +
      '</div>' +
      '<div class="back-logo">限界カルタ<small>GENKAI KARUTA</small></div>' +
    '</article>';
}

function paperSound(){
  try{
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const a = new Ctx();
    const o = a.createBufferSource();
    const b = a.createBuffer(1, a.sampleRate * 0.05, a.sampleRate);
    const d = b.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i] = (Math.random()*2-1) * (1-i/d.length);
    const g = a.createGain();
    g.gain.value = 0.035;
    o.buffer = b;
    o.connect(g);
    g.connect(a.destination);
    o.start();
  }catch(e){}
  if(navigator.vibrate) navigator.vibrate(8);
}

function flip(){
  paperSound();
  $("#card3d").classList.toggle("flipped");
  $("#hint").classList.add("hidden");
}

function move(n){
  current = (current + n + CARDS.length) % CARDS.length;
  renderViewer();
  paperSound();
}

$("#cardStage").addEventListener("click", flip);
$(".prev").onclick = () => move(-1);
$(".next").onclick = () => move(1);

let sx = 0, sy = 0;
$("#viewer").addEventListener("pointerdown", (e) => { sx = e.clientX; sy = e.clientY; });
$("#viewer").addEventListener("pointerup", (e) => {
  const dx = e.clientX - sx;
  const dy = e.clientY - sy;
  if(Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) move(dx < 0 ? 1 : -1);
});
window.addEventListener("keydown", (e) => {
  if(e.key === "ArrowRight") move(1);
  if(e.key === "ArrowLeft") move(-1);
  if(e.key === " ") flip();
});

function daySeed(){
  const d = new Date();
  return Number("" + d.getFullYear() + (d.getMonth()+1) + d.getDate());
}

function hash(s){
  let h = 2166136261;
  for(const ch of s){
    h ^= ch.charCodeAt(0);
    h = Math.imul(h,16777619);
  }
  return h >>> 0;
}

function todayCards(){
  const seed = daySeed();
  return CARDS.slice().sort((a,b) => hash(a.id + seed) - hash(b.id + seed)).slice(0,6);
}

function miniFallback(c){
  return '<div class="mini-fallback">' +
    '<div class="mkana">' + c.kana + '</div>' +
    '<div class="mphrase">' + c.lines.map(esc).join("<br>") + '</div>' +
    '<div class="micon">' + c.icon + '</div>' +
  '</div>';
}

function renderToday(){
  const cs = todayCards();
  $("#todayGrid").innerHTML = cs.map((c) => {
    const body = c.image
      ? '<img src="' + c.image + '" alt="' + esc(c.phrase) + '">'
      : miniFallback(c);
    return '<button class="mini-card ' + (selected.has(c.id) ? "selected" : "") +
      '" data-id="' + c.id + '" aria-pressed="' + selected.has(c.id) + '">' +
      body + '<span class="selectedMark">✓</span></button>';
  }).join("");

  $$(".mini-card").forEach((b) => {
    b.onclick = () => toggleSelect(b.dataset.id);
  });
  $("#makeResult").disabled = selected.size === 0;
}

function toggleSelect(id){
  if(selected.has(id)) selected.delete(id);
  else if(selected.size < 3) selected.add(id);
  else return toast("選べるのは3枚まで");
  renderToday();
  paperSound();
}

$("#makeResult").onclick = () => {
  renderResult();
  $("#todayPick").style.display = "none";
  $("#todayResult").classList.add("show");
  $("#todayView .scroll-view").scrollTop = 0;
  paperSound();
};

function renderResult(){
  const cs = Array.from(selected).map((id) => CARDS.find((c) => c.id === id));
  $("#resultCards").innerHTML = cs.map((c) => {
    if(c.image) return '<div class="result-thumb"><img src="' + c.image + '" alt=""></div>';
    return '<div class="result-thumb"><div class="simple"><b>' + c.kana + '</b><span>' + esc(c.phrase) + '</span></div></div>';
  }).join("");
}

$("#redo").onclick = () => {
  $("#todayResult").classList.remove("show");
  $("#todayPick").style.display = "block";
  $("#sharePreview").style.display = "none";
};

$("#saveImage").onclick = async () => {
  const url = await makeShareImage();
  const img = $("#sharePreview");
  img.src = url;
  img.style.display = "block";
  const a = document.createElement("a");
  a.href = url;
  a.download = "本日の限界_" + new Date().toISOString().slice(0,10) + ".png";
  document.body.appendChild(a);
  a.click();
  a.remove();
  toast("画像を作りました");
};

async function makeShareImage(){
  const cvs = document.createElement("canvas");
  cvs.width = 1080;
  cvs.height = 1920;
  const x = cvs.getContext("2d");
  x.fillStyle = "#090909";
  x.fillRect(0,0,cvs.width,cvs.height);
  x.fillStyle = "#f3eee5";
  x.font = "900 72px serif";
  x.fillText("本日の限界届",70,140);
  x.fillStyle = "#d93428";
  x.fillRect(70,180,220,8);
  x.fillStyle = "#a9a29a";
  x.font = "32px sans-serif";
  x.fillText("本日もなんとか終了しました。",70,245);

  const cs = Array.from(selected).map((id) => CARDS.find((c) => c.id === id));
  const cardW = 880, cardH = 430, left = 100;

  for(let i=0;i<cs.length;i++){
    const c = cs[i], top = 320 + i*480;
    x.save();
    roundedPath(x,left,top,cardW,cardH,28);
    x.clip();
    x.fillStyle = "#f3eee5";
    x.fillRect(left,top,cardW,cardH);

    if(c.image){
      try{
        const img = await loadImg(c.image);
        const r = Math.max(cardW/img.width, cardH/img.height);
        const w = img.width*r, h = img.height*r;
        x.drawImage(img,left+(cardW-w)/2,top+(cardH-h)/2,w,h);
        x.fillStyle = "#000a";
        x.fillRect(left,top+cardH-110,cardW,110);
        x.fillStyle = "#fff";
        x.font = "700 30px serif";
        wrap(x,c.phrase,left+30,top+cardH-62,820,38);
      }catch(e){
        drawTextCard(x,c,left,top,cardW,cardH);
      }
    }else{
      drawTextCard(x,c,left,top,cardW,cardH);
    }
    x.restore();
  }

  x.fillStyle = "#f3eee5";
  x.font = "900 46px serif";
  x.fillText("限界カルタ",70,1810);
  x.fillStyle = "#888";
  x.font = "22px sans-serif";
  x.fillText("GENKAI KARUTA",70,1850);
  return cvs.toDataURL("image/png");
}

function drawTextCard(x,c,l,t,w,h){
  x.fillStyle = "#f3eee5";
  x.fillRect(l,t,w,h);
  x.strokeStyle = "#111";
  x.lineWidth = 8;
  x.strokeRect(l+14,t+14,w-28,h-28);
  x.fillStyle = "#111";
  x.font = "900 92px serif";
  x.fillText(c.kana,l+w-150,t+115);
  x.font = "900 46px serif";
  wrap(x,c.phrase,l+55,t+110,w-240,58);
  x.font = "90px sans-serif";
  x.fillText(c.icon,l+w-170,t+h-65);
}

function loadImg(src){
  return new Promise((resolve,reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
}

function roundedPath(x,l,t,w,h,r){
  const rr = Math.min(r,w/2,h/2);
  x.beginPath();
  x.moveTo(l+rr,t);
  x.arcTo(l+w,t,l+w,t+h,rr);
  x.arcTo(l+w,t+h,l,t+h,rr);
  x.arcTo(l,t+h,l,t,rr);
  x.arcTo(l,t,l+w,t,rr);
  x.closePath();
}

function wrap(x,s,l,t,maxW,lineH){
  let line = "";
  for(const ch of s){
    const test = line + ch;
    if(x.measureText(test).width > maxW){
      x.fillText(line,l,t);
      line = ch;
      t += lineH;
    }else line = test;
  }
  x.fillText(line,l,t);
}

const categories = ["全部","生活・お金","仕事・人間関係","スマホ・SNS"];

function renderList(){
  $("#chips").innerHTML = categories.map((c) =>
    '<button class="chip ' + (c === currentCategory ? "on" : "") + '" data-cat="' + c + '">' + c + '</button>'
  ).join("");
  $$(".chip").forEach((b) => {
    b.onclick = () => { currentCategory = b.dataset.cat; renderList(); };
  });

  const cards = currentCategory === "全部" ? CARDS : CARDS.filter((c) => c.category === currentCategory);
  $("#listGrid").innerHTML = cards.map((c) => {
    const body = c.image
      ? '<img src="' + c.image + '" alt="' + esc(c.phrase) + '">'
      : '<div class="grid-fallback"><b>' + c.kana + '</b><span>' + c.lines.map(esc).join("<br>") + '</span></div>';
    return '<button class="grid-card" data-id="' + c.id + '">' + body + '</button>';
  }).join("");

  $$(".grid-card").forEach((b) => {
    b.onclick = () => {
      current = CARDS.findIndex((c) => c.id === b.dataset.id);
      switchView("viewerView");
      renderViewer();
    };
  });
}

$$(".navbtn").forEach((b) => {
  b.onclick = () => switchView(b.dataset.view);
});

function switchView(id){
  $$(".view").forEach((v) => v.classList.toggle("active",v.id === id));
  $$(".navbtn").forEach((b) => b.classList.toggle("on",b.dataset.view === id));
  $("#counter").style.display = id === "viewerView" ? "block" : "none";
  if(id === "todayView") renderToday();
  if(id === "listView") renderList();
}

function toast(s){
  const t = $("#toast");
  t.textContent = s;
  t.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove("show"),1500);
}

if("serviceWorker" in navigator){
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

renderViewer();
renderToday();
renderList();
