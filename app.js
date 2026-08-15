/* 🍊成长记 · 个人多功能工作台  app.js */
'use strict';
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const STORE = 'chengzhangji_v1';
const SUPPLEMENTS = ['益生菌','优截片+油切饮','美白饮胶原蛋白饮','钙+维D','复合维生素+葡萄籽','优思明'];
const todayStr = () => new Date().toISOString().slice(0,10);
const wkDays = ['一','二','三','四','五','六','日'];

/* ===== 数据层 ===== */
function defaultDB(){
  return {
    todos:[], pomo:{}, supplements:{}, sleep:null, dietWeight:[], measurements:[],
    bodyBaseline:{date:todayStr(), weight:66, waist:82, hip:102, thigh:63},
    bodyTarget:{weight:60},
    aiShangShanye:{startDate:'2026-07-21', records:{}},
    workout:{check:{}}, language:[], finance:[], recurring:[],
    reading:[], cats:{events:[]}, assets:{cash:0,stocks:0,funds:0,gold:0,savings:0,huabei:0,card:0}, douyin:[], wish:{redeemed:[]},
    taskMasters:[], musicPomo:{}, pantry:'', customWishes:[], city:'贵阳', views:{}
  };
}
let DB = loadDB();
function loadDB(){
  try{ const d = JSON.parse(localStorage.getItem(STORE)); if(d&&typeof d==='object') return Object.assign(defaultDB(),d); }catch(e){}
  return defaultDB();
}
function saveDB(){ localStorage.setItem(STORE, JSON.stringify(DB)); }

/* 旧版工作台数据迁移（保留消费/保健品记录） */
function migrateOld(old){
  const nd = defaultDB();
  if(old.checkin && Array.isArray(old.checkin)){
    old.checkin.forEach(r=>{ if(r.date && r.supplements) nd.supplements[r.date]=r.supplements; });
  }
  if(old.finance && Array.isArray(old.finance)){
    old.finance.forEach(r=>{
      nd.finance.push({id:Date.now()+Math.random(), date:r.date||todayStr(),
        type: r.type==='存钱'?'收入':'支出', cat: r.cat||(r.type==='存钱'?'存钱':'其他'),
        amt: parseFloat(r.amt||r.amount||0), note: r.note||''});
    });
  }
  if(old.weight && Array.isArray(old.weight)){
    old.weight.forEach(r=> nd.dietWeight.push({date:r.date, kg:parseFloat(r.kg||r.weight||0), feel:r.feel||''}));
  }
  if(old.language && Array.isArray(old.language)){
    old.language.forEach(r=> nd.language.push({date:r.date, lang:r.lang, min:r.min||0, content:r.content||''}));
  }
  return nd;
}

/* ===== 导航 ===== */
function buildBottomNav(){
  const bn = document.createElement('nav'); bn.className='bottom-nav';
  $$('#sidebar .nav-btn').forEach(b=>{
    const el=document.createElement('button');
    el.dataset.tab=b.dataset.tab;
    el.innerHTML=`<span class="bi">${b.querySelector('.ni').textContent}</span><span>${b.querySelector('.nt').textContent}</span>`;
    el.onclick=()=>switchTab(b.dataset.tab);
    bn.appendChild(el);
  });
  document.body.appendChild(bn);
}
function switchTab(tab){
  $$('#sidebar .nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  $$('.bottom-nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  $$('.module').forEach(m=>m.classList.toggle('active',m.id===tab));
  $('#sidebar').classList.remove('open'); $('#sidebarMask').classList.remove('show');
  if(tab!=='workout') pauseAllWorkoutVideos(); // 离开运动板块，停掉仍在播放的视频/声音
  if(tab==='plan'){ setTimeout(()=>{renderTodos();renderPomo();renderMusicPomo();},50); }
  if(tab==='finance'){ setTimeout(()=>{renderFinanceStats();renderFinance();renderAsset();},50); }
  if(tab==='workout') setTimeout(renderWorkoutToday,50);
  if(tab==='news'){ loadMarket(); renderAffairs(); renderKnowledge(); }
  if(tab==='weekly') setTimeout(renderWeekly,50);
  if(tab==='outfit') setTimeout(loadOutfit,50);
  if(tab==='diet') setTimeout(()=>{renderDietDay();renderWeekPlan();},50);
  if(tab==='wish') setTimeout(renderWish,50);
}
$$('#sidebar .nav-btn').forEach(b=> b.onclick=()=>switchTab(b.dataset.tab));
$('#menuToggle').onclick=()=>{ $('#sidebar').classList.toggle('open'); $('#sidebarMask').classList.toggle('show'); };
$('#sidebarMask').onclick=()=>{ $('#sidebar').classList.remove('open'); $('#sidebarMask').classList.remove('show'); };

/* ===== 通用 ===== */
function toast(msg){ const t=document.createElement('div'); t.textContent=msg; t.style.cssText='position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:rgba(74,59,46,.92);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;z-index:500'; document.body.appendChild(t); setTimeout(()=>t.remove(),1800); }
function uid(){ return Date.now()+''+Math.floor(Math.random()*1000); }

/* ===== 1. 今日计划 ===== */
function renderTodos(){
  ensureTaskMasters();
  const list=$('#todoList'); const t=DB.todos.filter(x=>x.date===todayStr());
  list.innerHTML = t.length? t.map(x=>`<li class="${x.done?'done':''}"><input type="checkbox" ${x.done?'checked':''} onchange="toggleTodo('${x.id}')"><span class="ttext">${esc(x.text)}${x.masterId?'<span class="todo-tag">'+esc(repeatLabel(x.repeat))+'</span>':''}</span><button class="todo-del" onclick="delTodo('${x.id}')">×</button></li>`).join('') : '<li style="color:var(--sub);border:none">今天还没有待办，加一条吧～</li>';
  renderTaskMasters();
}
function repeatLabel(r){ return {once:'一次',daily:'每天',alternate:'隔天',weekly:'每周',weekdays:'工作日',weekend:'周末',custom:'自定义'}[r]||r; }
function renderTaskMasters(){
  const box=$('#todoMasters'); if(!box)return;
  box.innerHTML = DB.taskMasters.length? '<div style="font-size:12px;color:var(--sub);margin:8px 0 4px">📌 重复规则（点击×取消）：'+DB.taskMasters.map(m=>`<span class="tm-tag">${esc(m.text)} · ${repeatLabel(m.repeat)} <button onclick="delTaskMaster('${m.id}')">×</button></span>`).join('')+'</div>' : '';
}
function ensureTaskMasters(){
  if(!DB.taskMasters) DB.taskMasters=[];
  const today=todayStr();
  DB.taskMasters.forEach(m=>{
    if(taskMasterActiveToday(m) && !DB.todos.some(t=>t.date===today && t.masterId===m.id)){
      DB.todos.push({id:uid(),text:m.text,done:false,date:today,masterId:m.id,repeat:m.repeat});
    }
  });
}
function taskMasterActiveToday(m){
  const start=m.startDate||todayStr();
  const today=todayStr();
  if(m.repeat==='daily') return true;
  if(m.repeat==='alternate'){
    const d=Math.floor((new Date(today)-new Date(start))/86400000);
    return d>=0 && d%2===0;
  }
  if(m.repeat==='weekly') return new Date(today).getDay()===new Date(start).getDay();
  if(m.repeat==='weekdays'){ const d=new Date(today).getDay(); return d>=1 && d<=5; }
  if(m.repeat==='weekend'){ const d=new Date(today).getDay(); return d===0 || d===6; }
  if(m.repeat==='custom'){ const d=new Date(today).getDay(); return (m.days||[]).includes(d); }
  return true;
}
function onRepeatChange(){ const v=$('#todoRepeat').value; if($('#customDays'))$('#customDays').style.display = v==='custom'?'flex':'none'; }
function addTodo(){
  const v=$('#todoInput').value.trim(); if(!v)return;
  const repeat=$('#todoRepeat')?$('#todoRepeat').value:'once';
  if(repeat==='custom'){
    const days=$$('#customDays input:checked').map(i=>parseInt(i.value));
    if(!days.length){ toast('请先勾选要重复的星期'); return; }
    const id=uid();
    DB.taskMasters.push({id,text:v,repeat,days,startDate:todayStr()});
    if(taskMasterActiveToday({repeat:'custom',days,startDate:todayStr()})) DB.todos.push({id:uid(),text:v,done:false,date:todayStr(),masterId:id,repeat});
  }
  else if(repeat==='once'){ DB.todos.push({id:uid(),text:v,done:false,date:todayStr()}); }
  else {
    const id=uid();
    DB.taskMasters.push({id,text:v,repeat,startDate:todayStr()});
    DB.todos.push({id:uid(),text:v,done:false,date:todayStr(),masterId:id,repeat});
  }
  $('#todoInput').value=''; if($('#todoRepeat'))$('#todoRepeat').value='once';
  if($('#customDays')){ $('#customDays').style.display='none'; $$('#customDays input').forEach(i=>i.checked=false); }
  saveDB(); renderTodos();
}
function delTaskMaster(id){
  DB.taskMasters=DB.taskMasters.filter(m=>m.id!==id);
  DB.todos=DB.todos.filter(t=>t.masterId!==id || t.date!==todayStr());
  saveDB(); renderTodos();
}
function toggleTodo(id){ const x=DB.todos.find(t=>t.id===id); if(x){x.done=!x.done; saveDB(); renderTodos();} }
function delTodo(id){ DB.todos=DB.todos.filter(t=>t.id!==id); saveDB(); renderTodos(); }
function renderSupp(){ const grid=$('#suppGrid'); const taken=DB.supplements[todayStr()]||[]; grid.innerHTML=SUPPLEMENTS.map(s=>`<label class="supp-item"><input type="checkbox" ${taken.includes(s)?'checked':''} data-supp="${s}"> ${s}</label>`).join(''); }
function saveSupplements(){ const arr=$$('#suppGrid input[data-supp]').filter(i=>i.checked).map(i=>i.dataset.supp); DB.supplements[todayStr()]=arr; saveDB(); toast('已保存今日保健品：'+ (arr.length?arr.join('、'):'无')); }

/* 艾上山野三伏贴阶段计划 */
const AISHANG_PHASES=[
  null,
  {name:'第一阶段：轻启调理期（第1-20天）', desc:'先温养：奇数天贴红色蛮腰贴，偶数天贴西红花养元贴+噗噗丸肚脐贴。'},
  {name:'第二阶段：加强塑型期（第21-40天）', desc:'先通后排：奇数天贴绿色炫腹贴，偶数天贴噗噗丸肚脐贴+蒸汽脚踝贴。'},
  {name:'第三阶段：巩固期（第41天起）', desc:'先红后绿循环巩固：单日红色蛮腰贴，双日绿色炫腹贴。'}
];
const AISHANG_PERIOD_RED=['红蛮腰双C贴（红色）','草本炫腹贴（绿色）','石斛地黄暖阳贴'];
const AISHANG_PERIOD_YELLOW=['西红花养元贴','噗噗丸肚脐贴（肚脐）','蒸汽脚踝贴','蕲艾噗噗丸'];
const AISHANG_PERIOD_GREEN=['龙骨灸贴（超长背贴）','润目贴'];
const AISHANG_PERIOD_WARN='经期盆腔充血，含强活血/川芎成分的产品绝对禁用；所有发热贴严禁过夜。';
function aishangDay(){
  const s=DB.aiShangShanye?.startDate||'2026-07-21';
  const start=new Date(s+'T00:00:00'); const now=new Date(todayStr()+'T00:00:00');
  const diff=Math.floor((now-start)/86400000)+1; // 第1天=开始当天
  return diff;
}
function aishangPlan(day){
  if(day<=0) return {phase:0, items:[], label:'未开始', desc:'还没到开始日期，开始后再来打卡。'};
  const odd=day%2===1;
  if(day<=20) return {phase:1, items:odd?['红蛮腰双C贴（红色）']:['西红花养元贴','噗噗丸肚脐贴（肚脐）'], label:AISHANG_PHASES[1].name, desc:AISHANG_PHASES[1].desc};
  if(day<=40) return {phase:2, items:odd?['草本炫腹贴（绿色）']:['噗噗丸肚脐贴（肚脐）','蒸汽脚踝贴'], label:AISHANG_PHASES[2].name, desc:AISHANG_PHASES[2].desc};
  return {phase:3, items:odd?['红蛮腰双C贴（红色）']:['草本炫腹贴（绿色）'], label:AISHANG_PHASES[3].name, desc:AISHANG_PHASES[3].desc};
}
function saveAishangStart(){
  const v=$('#aishangStart').value; if(!v)return;
  if(!DB.aiShangShanye) DB.aiShangShanye={startDate:v, records:{}};
  else DB.aiShangShanye.startDate=v;
  saveDB(); renderAishang(); toast('开始日期已更新');
}
function saveAishangPeriod(){
  const on=$('#aishangPeriod').checked;
  if(!DB.aiShangShanye) DB.aiShangShanye={startDate:'2026-07-21', records:{}};
  DB.aiShangShanye.periodMode=on;
  saveDB(); renderAishang();
  toast(on?'已开启经期模式，红色警戒区项目已屏蔽':'已关闭经期模式');
}
function saveAishang(){
  if(!DB.aiShangShanye) DB.aiShangShanye={startDate:'2026-07-21', records:{}};
  const arr=$$('#aishangChecks input[data-aishang]').filter(i=>i.checked).map(i=>i.dataset.aishang);
  DB.aiShangShanye.records[todayStr()]=arr;
  saveDB(); renderAishang(); toast(arr.length?'今日贴敷已记录 ✓':'今日已标记为未贴');
}
function aiTagClass(x){ if(x.includes('红色'))return 'ai-red'; if(x.includes('绿色'))return 'ai-green'; return ''; }
function backfillAishang(){
  if(!DB.aiShangShanye) DB.aiShangShanye={startDate:'2026-07-21', records:{}};
  const ass=DB.aiShangShanye;
  const start=new Date(ass.startDate+'T00:00:00');
  const today=new Date(todayStr()+'T00:00:00');
  let cnt=0;
  for(let d=new Date(start); d<today; d.setDate(d.getDate()+1)){
    const ds=d.toISOString().slice(0,10);
    const day=Math.floor((d-start)/86400000)+1;
    const plan=aishangPlan(day);
    if(plan.items.length && !ass.records[ds]){ ass.records[ds]=plan.items; cnt++; }
  }
  saveDB(); renderAishang();
  toast(cnt? ('已补齐 '+cnt+' 天历史记录 ✓') : '历史已补齐，无需重复');
}
function renderAishang(){
  const box=$('#aishangCard'); if(!box) return;
  const ass=DB.aiShangShanye||{startDate:'2026-07-21', records:{}};
  $('#aishangStart').value=ass.startDate;
  const periodOn=!!ass.periodMode;
  const periodInput=$('#aishangPeriod'); if(periodInput) periodInput.checked=periodOn;
  const day=aishangDay();
  const plan=aishangPlan(day);
  const todayRec=ass.records[todayStr()]||[];
  const elapsed=day>0?day:0;
  const recorded=Object.values(ass.records).filter(r=>r&&r.length>0).length;
  const target=Math.max(60, day);
  const pct=Math.min(100, Math.round(elapsed/target*100));
  $('#aishangDayNum').textContent=day>0?day:'--';
  $('#aishangPhase').textContent=plan.label;
  $('#aishangDesc').textContent=plan.desc;

  // 经期模式处理
  let warnHtml='';
  if(periodOn && plan.items.length){
    const red=plan.items.filter(x=>AISHANG_PERIOD_RED.some(r=>x.includes(r)));
    const yellow=plan.items.filter(x=>AISHANG_PERIOD_YELLOW.some(y=>x.includes(y)));
    if(red.length){
      warnHtml+=`<div class="ai-warn-box"><b>🩸 经期禁用提醒</b><br>今日推荐中的 ${red.join('、')} 属于经期红色警戒区，含活血/川芎成分或覆盖子宫，<b>今天不要贴</b>。已自动禁用勾选。</div>`;
    }
    if(yellow.length){
      warnHtml+=`<div class="ai-warn-box" style="background:#fffbe6;border-color:#f0d28a;color:#856404"><b>⚠️ 经期慎用提醒</b><br>${yellow.join('、')} 属黄区：经量大的前3天请停用，后期经量少时可酌用；噗噗丸若贴脚底时间减半。</div>`;
    }
    if(!red.length && !yellow.length){
      warnHtml+=`<div class="ai-warn-box" style="background:#eaf7ee;border-color:#abebc6;color:#1e8449"><b>✅ 今日推荐经期可用</b><br>当前推荐项目非活血/无发热风险，经期可用，但仍请控制时长、避免过夜。</div>`;
    }
    warnHtml+=`<div class="ai-warn-box" style="background:#eaf7ee;border-color:#abebc6;color:#1e8449"><b>💚 经期特别推荐（绿区）</b><br>如果腰酸背痛、全身发冷，可贴 <b>龙骨灸贴（超长背贴）</b>；眼睛疲劳可用 <b>润目贴</b>。两者全程可用。</div>`;
  }
  const existingWarn=box.querySelector('.ai-period-warn');
  if(existingWarn) existingWarn.remove();
  if(warnHtml){
    const div=document.createElement('div'); div.className='ai-period-warn'; div.innerHTML=warnHtml;
    const todayBox=box.querySelector('.aishang-today');
    if(todayBox) todayBox.parentNode.insertBefore(div, todayBox);
  }

  $('#aishangItems').innerHTML=plan.items.length? plan.items.map(x=>`<span class="ai-tag ${aiTagClass(x)} ${periodOn&&AISHANG_PERIOD_RED.some(r=>x.includes(r))?'ai-off':''}">${x}</span>`).join('') : '<span class="ai-tag ai-off">今日无需贴敷</span>';
  $('#aishangChecks').innerHTML=plan.items.length? plan.items.map(x=>{
    const isRed=periodOn && AISHANG_PERIOD_RED.some(r=>x.includes(r));
    const checked=todayRec.includes(x) && !isRed;
    return `<label class="ai-check" style="${isRed?'opacity:.6;background:#fdeaea':''}"><input type="checkbox" data-aishang="${x}" ${checked?'checked':''} ${isRed?'disabled':''}> <span>${x}${isRed?'（经期禁用）':''}</span></label>`;
  }).join('') : '';
  $('#aishangElapsed').textContent=elapsed;
  $('#aishangDone').textContent=recorded;
  $('#aishangProgressText').textContent=pct+'%';
  $('#aishangProgFill').style.width=pct+'%';
  $('#aishangNote').textContent = recorded===0 && elapsed>0
    ? '「App内打卡」目前为0，是因为这个打卡功能是今天才加的、你还没在App里点过。点「补齐 7/21 至今为已贴」可把过去这些天标记为已贴；之后每天点「保存今日贴敷」即可。'
    : '已进行'+elapsed+'天，App内已打卡'+recorded+'天，继续坚持 💪';
}

/* 番茄钟 */
let pomoTimer=null, pomoLeft=25*60, pomoRunning=false, pomoIsBreak=false;
function fmt(s){ return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function renderPomo(){ $('#pomoTime').textContent=fmt(pomoLeft); $('#pomoMode').textContent=pomoIsBreak?'休息':'专注'; $('#pomoDone').textContent=DB.pomo[todayStr()]||0; }
function togglePomo(){ if(pomoRunning){ clearInterval(pomoTimer); pomoRunning=false; $('#pomoToggle').textContent='继续'; } else { pomoRunning=true; $('#pomoToggle').textContent='暂停'; pomoTimer=setInterval(()=>{ pomoLeft--; if(pomoLeft<=0){ clearInterval(pomoTimer); pomoRunning=false; if(!pomoIsBreak){ DB.pomo[todayStr()]=(DB.pomo[todayStr()]||0)+1; saveDB(); } pomoIsBreak=!pomoIsBreak; pomoLeft=pomoIsBreak?5*60:25*60; $('#pomoToggle').textContent='开始'; toast(pomoIsBreak?'专注完成！休息5分钟':'休息结束，继续专注'); } renderPomo(); },1000); } }
function resetPomo(){ clearInterval(pomoTimer); pomoRunning=false; pomoIsBreak=false; pomoLeft=25*60; $('#pomoToggle').textContent='开始'; renderPomo(); }

/* ===== 音乐番茄钟 ===== */
const SONGS=[
  {t:'Die For You',a:'The Weeknd',sec:240,search:'Die For You The Weeknd'},
  {t:'Pink + White',a:'Frank Ocean',sec:209,search:'Pink+White Frank Ocean'},
  {t:'Best Part',a:'Daniel Caesar / H.E.R.',sec:228,search:'Best Part Daniel Caesar'},
  {t:'Confidently Lost',a:'Mac Ayres',sec:233,search:'Confidently Lost Mac Ayres'},
  {t:'Get You',a:'Daniel Caesar',sec:269,search:'Get You Daniel Caesar'},
  {t:'Redbone',a:'Childish Gambino',sec:327,search:'Redbone Childish Gambino'},
  {t:'晴天',a:'周杰伦',sec:269,search:'晴天 周杰伦'},
  {t:'江南',a:'林俊杰',sec:277,search:'江南 林俊杰'},
  {t:'Love Song',a:'方大同',sec:248,search:'Love Song 方大同'},
  {t:'春风吹',a:'方大同',sec:247,search:'春风吹 方大同'},
  {t:'普通朋友',a:'陶喆',sec:253,search:'普通朋友 陶喆'},
  {t:'爱你',a:'陈芳语',sec:227,search:'爱你 陈芳语'},
  {t:'Sexual Healing',a:'Marvin Gaye',sec:239,search:'Sexual Healing Marvin Gaye'},
  {t:'September',a:'Earth, Wind & Fire',sec:223,search:'September Earth Wind Fire'},
  {t:'夜空中最亮的星',a:'逃跑计划',sec:252,search:'夜空中最亮的星 逃跑计划'},
  {t:'起风了',a:'买辣椒也用券',sec:325,search:'起风了 买辣椒也用券'},
  {t:'Watermelon Sugar',a:'Harry Styles',sec:174,search:'Watermelon Sugar Harry Styles'},
  {t:'Levitating',a:'Dua Lipa',sec:203,search:'Levitating Dua Lipa'},
  {t:'Electric Feel',a:'MGMT',sec:229,search:'Electric Feel MGMT'},
  {t:'小幸运',a:'田馥甄',sec:255,search:'小幸运 田馥甄'},
  {t:'如果当时',a:'许嵩',sec:251,search:'如果当时 许嵩'},
  {t:'倒带',a:'蔡依林',sec:277,search:'倒带 蔡依林'},
  {t:'Sucker',a:'Jonas Brothers',sec:181,search:'Sucker Jonas Brothers'},
  {t:'橙月',a:'方大同',sec:240,search:'橙月 方大同'},
  {t:'Sunflower',a:'Post Malone / Swae Lee',sec:158,search:'Sunflower Post Malone'},
  {t:'东京漂移',a:'Teriyaki Boyz',sec:186,search:'Tokyo Drift Teriyaki Boyz'},
  {t:'想你的夜',a:'关喆',sec:288,search:'想你的夜 关喆'},
  {t:'慢慢喜欢你',a:'莫文蔚',sec:238,search:'慢慢喜欢你 莫文蔚'}
];
function openNetease(){ const s=musicTodaySongs[musicIdx]||musicTodaySongs[0]; if(!s){toast('先点歌单选一首');return;} window.open('https://music.163.com/#/search/m/?s='+encodeURIComponent(s.search),'_blank'); }
let musicTimer=null, musicLeft=0, musicPlaying=false, musicPaused=false, musicIdx=0, musicAutoNext=true, musicTodaySongs=[];
function dailySongs(){
  const d=new Date(); const seed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
  const arr=[]; const used=new Set();
  for(let i=0;i<10;i++){ let idx=(seed+i*13)%SONGS.length; while(used.has(idx))idx=(idx+1)%SONGS.length; used.add(idx); arr.push(SONGS[idx]); }
  return arr;
}
function fmtSong(sec){ return String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0'); }
function switchPomoMode(mode){
  $$('.pomo-tab').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
  $$('.pomo-mode-panel').forEach(p=>p.classList.toggle('active',p.id===(mode==='focus'?'focusPomo':'musicPomo')));
}
function renderMusicPomo(){
  if(!musicTodaySongs.length) musicTodaySongs=dailySongs();
  const list=$('#musicList'); if(!list) return;
  list.innerHTML=musicTodaySongs.map((s,i)=>`<div class="music-item ${i===musicIdx?'playing':''}" onclick="playMusicSong(${i})"><span class="mi-num">${String(i+1).padStart(2,'0')}</span><span class="mi-info"><div class="mi-title">${esc(s.t)}</div><div class="mi-artist">${esc(s.a)} · ${fmtSong(s.sec)}</div></span><a href="https://music.163.com/#/search/m/?s=${encodeURIComponent(s.search)}" target="_blank" class="mi-link" title="去网易云" onclick="event.stopPropagation()">🎧</a></div>`).join('');
  const cur=musicTodaySongs[musicIdx];
  $('#musicNow').innerHTML=cur?`<div class="vinyl ${musicPlaying?'spin':''}">💿</div><div class="now-info"><div class="now-title">${esc(cur.t)}</div><div class="now-artist">${esc(cur.a)}</div><div class="now-bar"><div class="now-progress" style="width:${cur?((cur.sec-musicLeft)/cur.sec*100):0}%"></div></div><div class="now-time">${fmtSong(Math.max(0,musicLeft))} / ${fmtSong(cur.sec)}</div></div>`:'<div class="hint">点击歌单开始听歌番茄 🎵</div>';
  $('#musicCount').textContent=(DB.musicPomo[todayStr()]||0);
  $('#musicToggle').textContent=musicPlaying?'暂停':(musicPaused?'继续':'开始');
  $('#musicToggle').className = musicPlaying?'btn-s':'btn-p';
  $('#musicAutoNext').checked=musicAutoNext;
}
function playMusicSong(idx){
  if(!musicTodaySongs.length) musicTodaySongs=dailySongs();
  if(idx<0||idx>=musicTodaySongs.length)return; musicIdx=idx; musicLeft=musicTodaySongs[idx].sec; startMusicPomo();
}
function startMusicPomo(){
  if(!musicTodaySongs.length) musicTodaySongs=dailySongs();
  clearInterval(musicTimer); musicPlaying=true; musicPaused=false;
  renderMusicPomo();
  musicTimer=setInterval(()=>{
    musicLeft--;
    if(musicLeft<=0){ completeMusicSong(); }
    else renderMusicPomo();
  },1000);
}
function pauseMusicPomo(){
  if(musicPlaying){ clearInterval(musicTimer); musicPlaying=false; musicPaused=true; renderMusicPomo(); return true; }
  return false;
}
function resumeMusicPomo(){ if(musicPaused && musicLeft>0){ startMusicPomo(); } }
function stopMusicPomo(){ clearInterval(musicTimer); musicPlaying=false; musicPaused=false; musicLeft=0; musicIdx=0; renderMusicPomo(); }
function toggleMusicPomo(){
  if(musicPlaying){ pauseMusicPomo(); toast('音乐番茄已暂停'); }
  else if(musicPaused){ resumeMusicPomo(); }
  else { playMusicSong(musicIdx||0); toast('开始听歌番茄，一首一首歌做下去～'); }
}
function nextMusicSong(){ playMusicSong((musicIdx+1)%musicTodaySongs.length); }
function prevMusicSong(){ playMusicSong((musicIdx-1+musicTodaySongs.length)%musicTodaySongs.length); }
function completeMusicSong(){
  clearInterval(musicTimer); musicPlaying=false; musicPaused=false;
  DB.musicPomo[todayStr()]=(DB.musicPomo[todayStr()]||0)+1; saveDB();
  toast(`🎵 听完一首！累计 ${DB.musicPomo[todayStr()]} 个音乐番茄`);
  if($('#wishBalance'))renderWish();
  if(musicAutoNext){ setTimeout(()=>nextMusicSong(),1500); }
  else { musicLeft=0; renderMusicPomo(); }
}

/* ===== 2. 早睡计划 ===== */
function currentSleepWeek(){
  const s=DB.sleep&&DB.sleep.setting; if(!s||!s.startDate) return 1;
  const start=new Date(s.startDate); const now=new Date();
  const days=Math.floor((now-start)/86400000); return Math.max(1,Math.floor(days/7)+1);
}
function renderSleep(){
  const s=DB.sleep&&DB.sleep.setting;
  if(s){ $('#sleepWork').value=s.work; $('#sleepRest').value=s.rest; $('#sleepWake').value=s.wake; }
  const wk=currentSleepWeek(); $('#sleepWeek').textContent=wk;
  const goal=adaptiveGoalMin(); const goalStr=minToBedtime(goal);
  const recs=recentBedtimes(7);
  const avg=recs.length? Math.round(recs.reduce((a,b)=>a+b.min,0)/recs.length) : null;
  let note;
  if(!recs.length){
    note='📌 还没有睡眠记录。先连续记录几天真实的入睡时间，目标会基于你的平均值每周提前约15分钟——循序渐进，绝不硬逼，也照顾你晚自习到23:00/23:30的节奏。';
  }else{
    note=`📈 基于你最近 ${recs.length} 天记录，平均入睡 <b>${minToBedtime(avg)}</b>。本周目标 <b>${goalStr}</b>（比平均早 ${Math.max(0,Math.round(avg-goal))} 分钟）。达标后下周自动再提前。`;
  }
  $('#sleepTargets').innerHTML=`<div class="sleep-goal-big">本周目标入睡 <b>${goalStr}</b></div>`+(s&&s.work?`<div class="sleep-goal-sub">你设的理想：工作日 ${esc(s.work)} · 休息日 ${esc(s.rest||'—')} · 起床 ${esc(s.wake||'—')}</div>`:'');
  $('#sleepGoalNote').innerHTML=note;
  renderSleepChart();
  // 本周打卡
  const key='W'+new Date().getFullYear()+'-'+wk;
  const arr=(DB.sleep&&DB.sleep.weekCheck&&DB.sleep.weekCheck[key])||[];
  const dow=new Date().getDay(); const todayIdx=(dow===0?6:dow-1);
  $('#sleepWeekCheck').innerHTML=wkDays.map((d,i)=>`<div class="wday ${arr[i]?'done':''} ${i===todayIdx?'cur':''}" onclick="toggleSleepDay(${i})"><div class="dname">周${d}</div>${arr[i]?'😴':'○'}</div>`).join('');
  // 回填今天的入睡记录
  const rec=DB.sleep&&DB.sleep.records&&DB.sleep.records[todayStr()];
  if($('#sleepRecord')) $('#sleepRecord').value=rec||'';
  const recHtml = rec
    ? `今天已记录：<b>${rec}</b>（目标 ${goalStr}）${bedtimeToMin(rec)<=goal?' ✅ 已达标':' ⚠️ 晚于目标，明天再早一点'}`
    : '还没记录，睡醒后补记今天的入睡时间也可以。';
  if($('#sleepRecordHint')) $('#sleepRecordHint').innerHTML=recHtml;
}
function bedtimeToMin(t){ const p=String(t).split(':'); const h=parseInt(p[0],10)||0,m=parseInt(p[1],10)||0; let v=h*60+m; if(h<12)v+=1440; return v; }
function minToBedtime(min){ let v=((Math.round(min)%1440)+1440)%1440; const h=Math.floor(v/60),m=v%60; return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0'); }
function recentBedtimes(n){ const res=[]; const rec=DB.sleep&&DB.sleep.records; if(!rec)return res; for(let i=n-1;i>=0;i--){ const d=new Date(); d.setDate(d.getDate()-i); const ds=d.toISOString().slice(0,10); if(rec[ds])res.push({date:ds,min:bedtimeToMin(rec[ds])}); } return res; }
function adaptiveGoalMin(){
  const recs=recentBedtimes(14); let base;
  if(!recs.length){ const s=DB.sleep&&DB.sleep.setting; base=s&&s.work?bedtimeToMin(s.work):23*60+30; }
  else { base=recs.reduce((a,b)=>a+b.min,0)/recs.length; }
  const goal=base-15; return Math.max(1350, Math.min(1530, goal)); // 22:30 ~ 00:30 之间
}
function renderSleepChart(){
  const cv=$('#sleepChart'); if(!cv)return;
  const recs=recentBedtimes(7);
  const labels=recs.map(r=>r.date.slice(5));
  const data=recs.map(r=>r.min);
  const goal=adaptiveGoalMin();
  const avg= data.length? data.reduce((a,b)=>a+b,0)/data.length : null;
  if(window._sleepChart) window._sleepChart.destroy();
  window._sleepChart=new Chart(cv,{type:'bar',data:{labels,datasets:[
    {label:'实际入睡',data,backgroundColor:'#ff8c42',borderRadius:5},
    {label:'本周目标',data:labels.map(()=>goal),type:'line',borderColor:'#3bb89a',borderDash:[5,4],pointRadius:0,fill:false},
    {label:'7天平均',data:labels.map(()=>avg),type:'line',borderColor:'#5aa9e6',borderDash:[2,3],pointRadius:0,fill:false}
  ]},options:{plugins:{legend:{position:'bottom',font:{size:10},labels:{boxWidth:12}}},scales:{y:{ticks:{callback:v=>v==null?'':minToBedtime(v)},suggestedMin:1320,suggestedMax:1560},x:{ticks:{font:{size:10}}}}}});
}
function saveSleepRecord(){
  const v=$('#sleepRecord').value; if(!v){toast('请选择今天的入睡时间');return;}
  DB.sleep=DB.sleep||{}; DB.sleep.records=DB.sleep.records||{};
  DB.sleep.records[todayStr()]=v;
  const goal=adaptiveGoalMin(); const met=bedtimeToMin(v)<=goal;
  const wk=currentSleepWeek(); const key='W'+new Date().getFullYear()+'-'+wk;
  DB.sleep.weekCheck=DB.sleep.weekCheck||{};
  const dow=new Date().getDay(); const i=(dow===0?6:dow-1);
  const arr=DB.sleep.weekCheck[key]||[false,false,false,false,false,false,false];
  arr[i]=met; DB.sleep.weekCheck[key]=arr;
  saveDB(); renderSleep();
  toast(met?`记录成功，已达标 ${v} ✅`:`已记录 ${v}（目标 ${minToBedtime(goal)}，明天再早一点）`);
}
function saveSleepSetting(){ const s={work:$('#sleepWork').value,rest:$('#sleepRest').value,wake:$('#sleepWake').value,startDate:(DB.sleep&&DB.sleep.setting&&DB.sleep.setting.startDate)||todayStr()}; DB.sleep=DB.sleep||{}; DB.sleep.setting=s; saveDB(); renderSleep(); toast('作息已保存'); }
function saveReminders(){ DB.sleep=DB.sleep||{}; DB.sleep.remind={wind:$('#remindWind').value,off:$('#remindOff').value,water:$('#remindWater').checked}; saveDB(); toast('提醒已保存'); }
function toggleSleepDay(i){ const wk=currentSleepWeek(); const key='W'+new Date().getFullYear()+'-'+wk; DB.sleep=DB.sleep||{}; DB.sleep.weekCheck=DB.sleep.weekCheck||{}; const arr=DB.sleep.weekCheck[key]||[false,false,false,false,false,false,false]; arr[i]=!arr[i]; DB.sleep.weekCheck[key]=arr; saveDB(); renderSleep(); }
function checkSleepToday(){ const wk=currentSleepWeek(); const key='W'+new Date().getFullYear()+'-'+wk; const dow=new Date().getDay(); const i=(dow===0?6:dow-1); toggleSleepDay(i); toast('已打卡今日早睡'); }

/* ===== 3. 每日饮食（30天循环） ===== 全部≤25分钟、少开火、小白也能做的快手营养餐，保留贵州风味 */
const WEEKLY_MEALS=[
  { // 周一
    breakfast:{n:'🥚 水煮蛋+全麦面包+无糖豆浆',buy:['鸡蛋','全麦面包','无糖豆浆'],pantry:['老干妈(仅1小勺蘸)'],steps:'鸡蛋水开煮8分钟；面包直接吃；豆浆微波1分钟。',kcal:300,note:'老干妈只当蘸料，不要拌整碗。'},
    lunch:{n:'♨️ 微波炉蒸鸡胸+糙米饭+凉拌黄瓜',buy:['鸡胸肉','糙米','黄瓜'],pantry:['生抽','醋','蒜'],steps:'鸡胸切片用生抽腌5分钟，盘里微波高火4-5分钟；糙米提前煮好；黄瓜拍碎加醋蒜拌。',kcal:400,note:'全程不用开火炒，微波炉搞定蛋白质。'},
    dinner:{n:'🍅 番茄豆腐汤+蒸南瓜',buy:['番茄','嫩豆腐','南瓜'],pantry:['蒜'],steps:'番茄切块煮软出汁加水，下豆腐煮3分钟；南瓜蒸15分钟。',kcal:220,note:'晚上喝汤吃饱，不馋夜宵。'}
  },
  { // 周二
    breakfast:{n:'🥚 水煮蛋+紫薯+纯牛奶',buy:['鸡蛋','紫薯','纯牛奶'],pantry:[],steps:'紫薯蒸20分钟；鸡蛋同煮；牛奶直接喝。',kcal:290,note:'甜糯紫薯能压住想吃甜品的冲动。'},
    lunch:{n:'🐟 酸汤鱼片(免处理鱼柳)+杂粮饭',buy:['巴沙鱼柳','番茄','豆芽','杂粮米'],pantry:['白酸汤','姜'],steps:'番茄炒汁+酸汤+水煮鱼片3分钟，加豆芽。',kcal:410,note:'用免处理的冷冻鱼柳，省事又鲜，不用杀鱼。'},
    dinner:{n:'🦐 白灼虾仁+凉拌生菜',buy:['虾仁','生菜'],pantry:['生抽','蒜'],steps:'虾仁水开煮2分钟；生菜焯水，蘸生抽蒜泥。',kcal:220,note:'白灼是最快手的低油高蛋白。'}
  },
  { // 周三
    breakfast:{n:'🥣 微波燕麦粥+水煮蛋+凉拌萝卜丝',buy:['燕麦','鸡蛋','白萝卜'],pantry:['糊辣椒','醋'],steps:'燕麦+水微波3分钟；鸡蛋煮8分钟；萝卜切丝加醋糊辣椒拌。',kcal:310,note:'糊辣椒+醋=贵州式开胃，热量低。'},
    lunch:{n:'🥚 虾仁蒸蛋+米饭',buy:['虾仁','鸡蛋','大米'],pantry:['生抽','香油'],steps:'鸡蛋打散加1.5倍温水，放虾仁，微波/蒸8分钟，淋生抽。',kcal:420,note:'一锅出，蛋白质满满，零失败。'},
    dinner:{n:'🐔 凉拌即食鸡丝+黄瓜',buy:['即食鸡胸','黄瓜'],pantry:['辣椒油(少)','醋','生抽'],steps:'即食鸡胸撕丝，和黄瓜一起拌。',kcal:230,note:'即食鸡胸免煮，懒人福音。'}
  },
  { // 周四
    breakfast:{n:'🌽 玉米+水煮蛋+无糖酸奶',buy:['玉米','鸡蛋','无糖酸奶'],pantry:[],steps:'玉米蒸15分钟；鸡蛋煮8分钟；酸奶直接吃。',kcal:280,note:'早餐简单，给午饭留热量空间。'},
    lunch:{n:'🍗 少油煎鸡腿排+红薯饭',buy:['鸡腿肉(去骨)','红薯','大米'],pantry:['黑胡椒','盐'],steps:'鸡腿肉少油煎两面金黄；红薯切块和米一起煮饭。',kcal:440,note:'煎比炖简单，红薯饭顶饱。'},
    dinner:{n:'🍄 菌菇豆腐汤+白灼西兰花',buy:['豆腐','金针菇','西兰花'],pantry:['生抽','香油'],steps:'菌菇豆腐煮汤；西兰花白灼蘸生抽。',kcal:200,note:'晚上喝汤+焯菜，几乎无油。'}
  },
  { // 周五
    breakfast:{n:'🥞 全麦鸡蛋饼+豆浆',buy:['全麦面粉','鸡蛋','无糖豆浆'],pantry:['葱花'],steps:'面粉+鸡蛋+水调糊，少油煎成饼；豆浆微波。',kcal:300,note:'一张饼搞定碳水+蛋白。'},
    lunch:{n:'🍅 番茄炒蛋+米饭(最家常)',buy:['番茄','鸡蛋','大米'],pantry:['糖(少)','盐'],steps:'鸡蛋炒散盛出，番茄炒出汁下蛋，少糖提鲜。',kcal:420,note:'国民下饭菜，零失败。'},
    dinner:{n:'🥚 凉拌豆腐+蒸蛋',buy:['嫩豆腐','鸡蛋'],pantry:['糊辣椒','生抽','香油'],steps:'豆腐切块淋糊辣椒生抽；鸡蛋蒸8分钟。',kcal:230,note:'两块豆腐一晚管饱，便宜又低脂。'}
  },
  { // 周六（购物日）
    breakfast:{n:'🥣 牛奶泡麦片+香蕉',buy:['即食麦片','纯牛奶','香蕉'],pantry:[],steps:'麦片加牛奶泡2分钟；香蕉直接吃。',kcal:300,note:'吃完去采购下周食材。'},
    lunch:{n:'🍚 电饭煲番茄焖饭(一锅出)',buy:['番茄','鸡胸丁/香肠','玉米粒','大米'],pantry:['生抽','橄榄油'],steps:'米加水，放番茄(去皮)和配料，按煮饭键，出锅拌匀。',kcal:450,note:'电饭煲搞定，不用看火。'},
    dinner:{n:'🥒 凉拌三丝(黄瓜/木耳/胡萝卜)',buy:['黄瓜','木耳','胡萝卜'],pantry:['糊辣椒','醋','生抽'],steps:'木耳泡发焯水，三丝凉拌。',kcal:180,note:'周六晚餐清肠胃，为下周做准备。'}
  },
  { // 周日
    breakfast:{n:'🍠 红薯+水煮蛋+黑咖啡/茶',buy:['红薯','鸡蛋'],pantry:['茶叶/咖啡'],steps:'红薯蒸20分钟；鸡蛋水煮。',kcal:270,note:'周日早餐轻一点，下午可能有社交餐。'},
    lunch:{n:'🍗 微波炉/空气炸锅鸡翅+米饭',buy:['鸡翅中','大米'],pantry:['生抽','蚝油(少)','黑胡椒'],steps:'鸡翅划刀腌10分钟，微波炉/空气炸锅15分钟。',kcal:460,note:'腌一下丢进去就行，不用守着。'},
    dinner:{n:'🥬 上汤娃娃菜(蒜+皮蛋)',buy:['娃娃菜','皮蛋1个'],pantry:['蒜'],steps:'蒜爆香加水煮娃娃菜，放皮蛋碎提鲜。',kcal:200,note:'周日晚上清空冰箱蔬菜，迎接新一周。'}
  }
];
const MEAL_LABEL={breakfast:'🌅 早餐',lunch:'☀️ 午餐',dinner:'🌇 晚餐'};
let curMeal='breakfast';
function dayIndex(dateStr){ const d=new Date(dateStr); const base=new Date('2026-01-01'); return Math.floor((d-base)/86400000); }
function weekDayIndex(dateStr){ const d=new Date(dateStr); return (d.getDay()+6)%7; }
function mealFor(meal,dateStr){ const i=weekDayIndex(dateStr); return WEEKLY_MEALS[i][meal]; }
function switchMeal(btn){ $$('.dtab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); curMeal=btn.dataset.meal; renderDietDay(); }
function pantryList(){ return (DB.pantry||'').split(/[,，、\n]+/).map(x=>x.trim()).filter(Boolean); }
function renderDietDay(){
  const d=$('#dietDate').value||todayStr(); const m=mealFor(curMeal,d); const md=$('#mealDetail');
  const have=pantryList();
  const needBuy=m.buy.filter(x=>!have.some(h=>x.includes(h)||h.includes(x)));
  const haveFromPantry=m.buy.filter(x=>have.some(h=>x.includes(h)||h.includes(x)));
  md.innerHTML=`<h4>${MEAL_LABEL[curMeal]} · ${esc(m.n)}</h4>
    <div class="mc"><b>🛒 需购买：</b>${needBuy.length?needBuy.map(esc).join('、'):'<span style="color:var(--teal)">家里都有 ✓</span>'}<br>
    ${haveFromPantry.length?`<b>🏠 家里已有：</b>${haveFromPantry.map(esc).join('、')}<br>`:''}
    <b>👩‍🍳 做法：</b>${esc(m.steps)}</div>
    <span class="kcal">约 ${m.kcal} kcal</span>
    <div class="diet-note">💡 ${esc(m.note)}</div>`;
  $('#dietDayLabel').textContent='（'+new Date(d).toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'})+'，本周第'+(weekDayIndex(d)+1)+'天）';
  renderShopList(d);
  renderDietCoach();
}
function shopCategory(x){
  const v=['青菜','西红柿','番茄','尖椒','油麦菜','黄瓜','蒜苗','芦笋','生菜','娃娃菜','萝卜','胡萝卜','木耳','金针菇','平菇','蘑菇','折耳根','豆芽','紫薯','红薯','南瓜','土豆','茄子','白菜','菠菜','西蓝花','青椒'];
  const f=['苹果','香蕉','橙子','梨','草莓','蓝莓','猕猴桃','芒果','葡萄'];
  const m=['鸡胸','鸡腿','牛肉','卤牛肉','鱼','虾','鸡蛋','牛奶','豆浆','酸奶','鸭','牛腩','猪肉','后腿肉','鸡肉'];
  const g=['米粉','糙米','大米','杂粮米','全麦','荞麦面','燕麦','馒头','玉米','面条','意面','面包'];
  const b=['豆腐','嫩豆腐','豆干'];
  const n=['花生','坚果','核桃','杏仁','腰果'];
  const s=['蒜','姜','辣椒面','糊辣椒','辣椒油','老干妈','豆瓣酱','豆豉','生抽','醋','料酒','八角','花椒','葱花','橄榄油','香油','胡椒粉','白酸汤','酸汤','茶叶','咖啡','皮蛋','盐','糖'];
  if(v.some(k=>x.includes(k)))return '🥬 蔬菜';
  if(f.some(k=>x.includes(k)))return '🍎 水果';
  if(m.some(k=>x.includes(k)))return '🥩 肉蛋奶';
  if(g.some(k=>x.includes(k)))return '🌾 主食杂粮';
  if(b.some(k=>x.includes(k)))return '🫘 豆制品';
  if(n.some(k=>x.includes(k)))return '🥜 坚果';
  if(s.some(k=>x.includes(k)))return '🧂 佐料调味';
  return '🛒 其他';
}
function renderShopList(dateStr){
  const have=pantryList();
  const need=new Map();
  for(let i=0;i<7;i++){
    ['breakfast','lunch','dinner'].forEach(ml=>{
      const meal=WEEKLY_MEALS[i][ml];
      meal.buy.forEach(x=>{
        if(!have.some(h=>x.includes(h)||h.includes(x))) need.set(x,(need.get(x)||0)+1);
      });
    });
  }
  const isSat=new Date().getDay()===6;
  $('#shopCardTitle').textContent=(isSat?'🛒 周六采购提醒：下周要买这些（已按类别分好）':'🛒 本周采购清单（已分类）');
  if(!need.size){ $('#shopList').innerHTML='<span class="hint">根据你填的 pantry，本周食材基本齐全 🎉</span>'; return; }
  const order=['🥬 蔬菜','🍎 水果','🥩 肉蛋奶','🌾 主食杂粮','🫘 豆制品','🥜 坚果','🧂 佐料调味','🛒 其他'];
  const groups={}; need.forEach((n,x)=>{ const c=shopCategory(x); (groups[c]=groups[c]||[]).push({x,n}); });
  $('#shopList').innerHTML=order.filter(c=>groups[c]).map(c=>`<div class="shop-group"><div class="shop-g-title">${c}</div><div class="shop-g-items">${groups[c].map(o=>`<span class="shop-tag">${esc(o.x)}${o.n>1?'×'+o.n:''}</span>`).join('')}</div></div>`).join('');
}
function savePantry(){ DB.pantry=$('#pantryInput').value; saveDB(); renderDietDay(); toast('食材清单已保存，餐单已重新匹配'); }
function renderDietCoach(){
  const hour=new Date().getHours();
  const isSat=new Date().getDay()===6;
  let msg='';
  if(isSat) msg='🛒 今天是周六！先填好家里现有食材，再按下方清单采购下周食材，避免乱花钱。';
  else if(hour>=20) msg='🌙 晚上别点夜宵。如果饿，先喝一杯温水，等15分钟；还饿就吃个水煮蛋或一小把坚果。';
  else if(hour>=14) msg='🍵 下午想喝奶茶/甜品？先喝一杯温水或无糖茶，等10分钟，冲动往往会消失。';
  else msg='🌶️ 贵州人爱吃辣没问题，辣能提代谢；但要控油和盐， progressively 减少重油重盐，坚持3周口味会明显变淡。';
  $('#dietCoach').innerHTML=`<div class="coach-box"><b>🍊 饮食教练</b><p>${msg}</p></div>`;
}
function renderWeekPlan(){
  const d=$('#dietDate').value||todayStr();
  const start=new Date(d); start.setDate(start.getDate()-weekDayIndex(d));
  let html='<div class="week-plan">';
  for(let i=0;i<7;i++){
    const day=new Date(start); day.setDate(start.getDate()+i);
    const ds=day.toISOString().slice(0,10); const isToday=ds===todayStr();
    html+=`<div class="wp-day ${isToday?'today':''}"><div class="wp-date">${['一','二','三','四','五','六','日'][i]}${isToday?' · 今天':''}</div>`;
    ['breakfast','lunch','dinner'].forEach(ml=>{
      const m=WEEKLY_MEALS[i][ml];
      html+=`<div class="wp-meal" onclick="curMeal='${ml}'; document.querySelectorAll('.dtab').forEach(b=>b.classList.toggle('active',b.dataset.meal==='${ml}')); renderDietDay();"><b>${MEAL_LABEL[ml].split(' ')[1]}</b>${esc(m.n)}</div>`;
    });
    html+='</div>';
  }
  html+='</div>';
  $('#weekPlan').innerHTML=html;
}
/* ===== 身材数据 & 目标 ===== */
function saveBsWeight(){
  const d=$('#bsWeightDate').value||todayStr();
  const kg=parseFloat($('#bsWeightKg').value);
  if(!kg){toast('请输入体重');return;}
  DB.dietWeight=DB.dietWeight.filter(x=>x.date!==d);
  DB.dietWeight.push({date:d,kg,note:$('#bsWeightNote').value||''});
  saveDB(); renderBodyStats(); toast('体重已记录 ✓');
}
function saveMeasurement(){
  const d=$('#bsMeasDate').value||todayStr();
  const waist=parseFloat($('#bsWaist').value), hip=parseFloat($('#bsHip').value), thigh=parseFloat($('#bsThigh').value);
  if(!(waist>0&&hip>0&&thigh>0)){toast('请填写三项围度');return;}
  DB.measurements=DB.measurements||[];
  DB.measurements=DB.measurements.filter(x=>x.date!==d);
  DB.measurements.push({date:d,waist,hip,thigh,note:''});
  saveDB(); renderBodyStats(); toast('三围已记录 ✓');
}
function saveBsTarget(){
  const t=parseFloat($('#bsTarget').value);
  if(!t){toast('请输入目标体重');return;}
  DB.bodyTarget=DB.bodyTarget||{}; DB.bodyTarget.weight=t; saveDB(); renderBodyStats(); toast('目标已保存');
}
function setBaselineFromCurrent(){
  const w=[...DB.dietWeight].sort((a,b)=>a.date.localeCompare(b.date));
  const m=[...(DB.measurements||[])].sort((a,b)=>a.date.localeCompare(b.date));
  if(!confirm('将把当前最新体重'+(w.length?w[w.length-1].kg:'')+'kg 与最新三围设为新基线（旧基线仍保留在记录里对比）？'))return;
  DB.bodyBaseline={
    date: todayStr(),
    weight: w.length? w[w.length-1].kg : (DB.bodyBaseline?DB.bodyBaseline.weight:66),
    waist: m.length? m[m.length-1].waist : (DB.bodyBaseline?DB.bodyBaseline.waist:82),
    hip: m.length? m[m.length-1].hip : (DB.bodyBaseline?DB.bodyBaseline.hip:102),
    thigh: m.length? m[m.length-1].thigh : (DB.bodyBaseline?DB.bodyBaseline.thigh:63)
  };
  saveDB(); renderBodyStats(); toast('已更新基线');
}
function renderBodyStats(){
  const b=DB.bodyBaseline||{date:todayStr(),weight:66,waist:82,hip:102,thigh:63};
  const target=(DB.bodyTarget&&DB.bodyTarget.weight)||60;
  const w=[...DB.dietWeight].sort((a,b)=>a.date.localeCompare(b.date));
  const m=[...(DB.measurements||[])].sort((a,b)=>a.date.localeCompare(b.date));
  $('#bsWeightDate').value=todayStr(); $('#bsMeasDate').value=todayStr(); $('#bsTarget').value=target;
  const latestW = w.length? w[w.length-1].kg : b.weight;
  const cur = m.length? m[m.length-1] : b;
  // 三围测量到期提醒（每3个月）
  const lastMeasDate = m.length? m[m.length-1].date : b.date;
  const ld=lastMeasDate.split('-').map(Number); const due=new Date(ld[0],ld[1]-1,ld[2]); due.setDate(due.getDate()+90);
  const td=todayStr().split('-').map(Number); const today=new Date(td[0],td[1]-1,td[2]);
  const overdue = due <= today;
  $('#bsMeasDue').innerHTML = overdue
    ? `⏰ 距上次测量已超 3 个月，建议现在记一次三围（上次 ${lastMeasDate}）`
    : `📅 下次三围测量约 ${due.getFullYear()}-${String(due.getMonth()+1).padStart(2,'0')}-${String(due.getDate()).padStart(2,'0')}（每 3 个月一次）`;
  // 计算与分析
  const wDelta=(latestW-b.weight);
  const whrB=(b.waist/b.hip), whrC=(cur.waist/cur.hip);
  const progress = b.weight>target ? Math.max(0,Math.min(100,((b.weight-latestW)/(b.weight-target))*100)) : 0;
  const el=$('#bodyStats');
  el.innerHTML = `
    <div class="bs-grid">
      <div class="bs-kpi"><span>当前体重</span><b>${latestW}kg</b><i class="${wDelta<=0?'down':'up'}">${wDelta>0?'+':''}${wDelta.toFixed(1)} vs 基线</i></div>
      <div class="bs-kpi"><span>目标体重</span><b>${target}kg</b><i>还差 ${(latestW-target).toFixed(1)}kg</i></div>
      <div class="bs-kpi"><span>腰臀比</span><b>${whrC.toFixed(2)}</b><i class="${whrC<whrB?'down':'up'}">${whrC<whrB?'↓改善':'持平'}</i></div>
    </div>
    <div class="bs-prog"><div class="bs-prog-bar" style="width:${progress}%"></div></div>
    <div class="bs-note">距离目标进度 ${progress.toFixed(0)}%（基线 ${b.weight}kg → 目标 ${target}kg）</div>
    <div class="chart-row">
      <div class="chart-box"><div class="chart-t">体重变化 vs 基线</div><canvas id="bsWeightChart"></canvas></div>
      <div class="chart-box"><div class="chart-t">三围对比（基线 vs 最新）</div><canvas id="bsMeasChart"></canvas></div>
    </div>
    <div class="bs-analyze">
      <b>📊 数据分析</b>
      <ul>
        <li>体重：基线 ${b.weight}kg → 最新 ${latestW}kg（${wDelta>0?'增加':'减少'}了 ${Math.abs(wDelta).toFixed(1)}kg）。${progress>0?`已朝目标推进 ${progress.toFixed(0)}%`:''}</li>
        <li>腰臀比 WHR：${whrB.toFixed(2)} → ${whrC.toFixed(2)}。腰臀比越低中心性肥胖风险越低（女性健康参考≈0.85，男性≈0.90）；腰围下降说明内脏脂肪在减少。</li>
        <li>三围对比基线：腰围 ${cur.waist-b.waist>0?'+':''}${(cur.waist-b.waist).toFixed(1)}cm · 臀围 ${cur.hip-b.hip>0?'+':''}${(cur.hip-b.hip).toFixed(1)}cm · 大腿围 ${cur.thigh-b.thigh>0?'+':''}${(cur.thigh-b.thigh).toFixed(1)}cm。</li>
        <li>建议：体重与腰围同步下降、臀围/大腿围不大幅缩水，说明在减脂而非单纯掉肌肉，继续保持爬坡 + 充足蛋白质摄入。</li>
      </ul>
    </div>
    ${m.length? '<div class="bs-hist"><b>三围记录：</b>'+m.map(x=>`${x.date.slice(5)} 腰${x.waist}/臀${x.hip}/腿${x.thigh}`).join(' · ')+'</div>':''}
  `;
  const cv1=$('#bsWeightChart');
  if(cv1){
    if(window._bsWeightChart)window._bsWeightChart.destroy();
    const labels=w.map(x=>x.date.slice(5));
    window._bsWeightChart=new Chart(cv1,{type:'line',data:{labels:labels.length?labels:['—'],datasets:[
      {label:'体重kg',data:w.map(x=>x.kg),borderColor:'#ff8c42',backgroundColor:'rgba(255,140,66,.15)',fill:true,tension:.25},
      {label:'基线'+b.weight+'kg',data:labels.map(()=>b.weight),borderColor:'#9b8579',borderDash:[6,4],pointRadius:0,fill:false}
    ]},options:{plugins:{legend:{font:{size:10}}},scales:{y:{suggestedMin:Math.min(b.weight,latestW)-2,suggestedMax:Math.max(b.weight,latestW)+2}}}});
  }
  const cv2=$('#bsMeasChart');
  if(cv2){
    if(window._bsMeasChart)window._bsMeasChart.destroy();
    window._bsMeasChart=new Chart(cv2,{type:'bar',data:{labels:['腰围','臀围','大腿围'],datasets:[
      {label:'基线',data:[b.waist,b.hip,b.thigh],backgroundColor:'#ffd9b3'},
      {label:'最新',data:[cur.waist,cur.hip,cur.thigh],backgroundColor:'#ff8c42'}
    ]},options:{plugins:{legend:{font:{size:10}}},scales:{y:{suggestedMin:Math.min(b.waist,b.hip,b.thigh)-5}}}});
  }
}

/* ===== 3.1 实际饮食记录 & 营养分析 ===== */
// 食物库：k 关键词, c 每100g热量(kcal), cat 类别, p 默认一份克数(无重量时)
const FOODS=[
  {k:'米饭',c:116,cat:'grain',p:200},{k:'大米',c:346,cat:'grain',p:150},{k:'面条',c:110,cat:'grain',p:200},{k:'馒头',c:220,cat:'grain',p:80},{k:'全麦面包',c:250,cat:'grain',p:60},{k:'面包',c:265,cat:'grain',p:60},{k:'燕麦',c:380,cat:'grain',p:40},{k:'即食麦片',c:380,cat:'grain',p:40},{k:'红薯',c:90,cat:'grain',p:150},{k:'紫薯',c:90,cat:'grain',p:150},{k:'玉米',c:112,cat:'grain',p:150},{k:'土豆',c:77,cat:'grain',p:150},{k:'南瓜',c:26,cat:'grain',p:200},{k:'糙米',c:120,cat:'grain',p:150},{k:'杂粮饭',c:120,cat:'grain',p:150},{k:'荞麦面',c:110,cat:'grain',p:200},
  {k:'鸡蛋',c:144,cat:'protein',p:50},{k:'鸡胸',c:133,cat:'protein',p:150},{k:'即食鸡胸',c:130,cat:'protein',p:100},{k:'鸡腿',c:165,cat:'protein',p:150},{k:'鸡翅',c:194,cat:'protein',p:100},{k:'鸡肉',c:165,cat:'protein',p:150},{k:'牛肉',c:250,cat:'protein',p:150},{k:'牛腩',c:330,cat:'protein',p:150},{k:'鱼',c:90,cat:'protein',p:150},{k:'巴沙鱼',c:90,cat:'protein',p:150},{k:'鱼片',c:90,cat:'protein',p:150},{k:'虾仁',c:93,cat:'protein',p:100},{k:'虾',c:93,cat:'protein',p:100},{k:'豆腐',c:80,cat:'protein',p:150},{k:'嫩豆腐',c:80,cat:'protein',p:150},{k:'豆干',c:140,cat:'protein',p:100},{k:'香肠',c:300,cat:'protein',p:80},{k:'皮蛋',c:170,cat:'protein',p:50},
  {k:'西兰花',c:34,cat:'veg',p:150},{k:'生菜',c:15,cat:'veg',p:150},{k:'黄瓜',c:16,cat:'veg',p:150},{k:'番茄',c:18,cat:'veg',p:150},{k:'西红柿',c:18,cat:'veg',p:150},{k:'油麦菜',c:20,cat:'veg',p:150},{k:'白菜',c:17,cat:'veg',p:150},{k:'娃娃菜',c:17,cat:'veg',p:150},{k:'菠菜',c:23,cat:'veg',p:150},{k:'胡萝卜',c:41,cat:'veg',p:100},{k:'萝卜',c:21,cat:'veg',p:150},{k:'木耳',c:27,cat:'veg',p:50},{k:'金针菇',c:32,cat:'veg',p:100},{k:'平菇',c:33,cat:'veg',p:100},{k:'豆芽',c:18,cat:'veg',p:150},{k:'青椒',c:22,cat:'veg',p:100},{k:'尖椒',c:22,cat:'veg',p:100},{k:'蘑菇',c:22,cat:'veg',p:100},{k:'青菜',c:20,cat:'veg',p:150},
  {k:'豆浆',c:31,cat:'dairy',p:250},{k:'牛奶',c:60,cat:'dairy',p:250},{k:'酸奶',c:72,cat:'dairy',p:200},
  {k:'香蕉',c:89,cat:'fruit',p:120},{k:'苹果',c:52,cat:'fruit',p:150},{k:'橙子',c:47,cat:'fruit',p:150},
  {k:'老干妈',c:320,cat:'fat',p:10},{k:'糊辣椒',c:350,cat:'fat',p:10},{k:'辣椒油',c:884,cat:'fat',p:10},{k:'橄榄油',c:884,cat:'fat',p:10},{k:'油',c:884,cat:'fat',p:10},{k:'花生',c:567,cat:'fat',p:30},{k:'坚果',c:600,cat:'fat',p:30},
  {k:'糖',c:400,cat:'other',p:10},{k:'奶茶',c:70,cat:'other',p:300},{k:'啤酒',c:43,cat:'other',p:300},{k:'蛋糕',c:350,cat:'other',p:80},{k:'甜品',c:350,cat:'other',p:80},{k:'咖啡',c:2,cat:'other',p:200},{k:'茶',c:2,cat:'other',p:200}
];
const FOOD_UNIT={g:1,克:1,kg:1000,公斤:1000,个:50,颗:30,碗:250,份:150,片:30,根:100,只:150,杯:240,瓶:500};
const CAT_NAME={protein:'🥩 蛋白质',veg:'🥬 蔬菜',grain:'🌾 主食',fat:'🧈 脂肪/油脂',dairy:'🥛 奶豆',fruit:'🍎 水果',other:'🍬 其他'};
const CAT_COLOR={protein:'#ff7a59',veg:'#3fb37f',grain:'#e0a458',fat:'#c98bdb',dairy:'#5aa9e6',fruit:'#ff9aa2',other:'#bbb'};
const DIET_KCAL_TARGET=1500;
function gramsNear(text,i,len){
  const win=text.slice(Math.max(0,i-12),i)+text.slice(i+len,i+len+12);
  const m=win.match(/(\d+(?:\.\d+)?)\s*(g|克|kg|公斤|个|颗|碗|份|片|根|只|杯|瓶)/);
  if(!m)return null;
  return parseFloat(m[1])*(FOOD_UNIT[m[2]]||1);
}
function parseMeal(text){
  text=(text||'').replace(/，/g,',');
  const items=[]; const consumed=[];
  const sorted=[...FOODS].sort((a,b)=>b.k.length-a.k.length);
  for(const f of sorted){
    let i=text.indexOf(f.k);
    while(i>=0){
      const end=i+f.k.length;
      if(!consumed.some(([s,e])=>i<e&&end>s)){
        let g=gramsNear(text,i,f.k.length); if(g==null)g=f.p;
        items.push({name:f.k,grams:Math.round(g),kcal:Math.round(f.c*g/100),cat:f.cat});
        consumed.push([i,end]); break;
      }
      i=text.indexOf(f.k,i+1);
    }
  }
  const cats={protein:0,veg:0,grain:0,fat:0,dairy:0,fruit:0,other:0};
  let total=0; items.forEach(it=>{cats[it.cat]+=it.kcal;total+=it.kcal;});
  return {items,total,cats};
}
function analyzeDiet(){
  const date=$('#dietLogDate').value||todayStr();
  const b=parseMeal($('#mealInB').value), l=parseMeal($('#mealInL').value), d=parseMeal($('#mealInD').value);
  const dayTotal=b.total+l.total+d.total;
  const cats={protein:b.cats.protein+l.cats.protein+d.cats.protein,veg:b.cats.veg+l.cats.veg+d.cats.veg,grain:b.cats.grain+l.cats.grain+d.cats.grain,fat:b.cats.fat+l.cats.fat+d.cats.fat,dairy:b.cats.dairy+l.cats.dairy+d.cats.dairy,fruit:b.cats.fruit+l.cats.fruit+d.cats.fruit,other:b.cats.other+l.cats.other+d.cats.other};
  const issues=[];
  if(cats.protein<250)issues.push('蛋白质偏少（建议一天≥250kcal蛋白质来源，约一个鸡蛋+一掌心肉/豆腐）');
  if(cats.veg<150)issues.push('蔬菜不足（建议每餐都有一份绿叶菜，帮助饱腹和通便）');
  if(cats.grain>700)issues.push('主食/碳水偏多（米饭面条可减半或换红薯杂粮）');
  if(cats.fat>400)issues.push('脂肪偏高（油、老干妈、花生坚果放多了，注意控量）');
  if(dayTotal<1000)issues.push('总热量偏低，小心饿出暴食，下午可加个蛋或酸奶');
  if(dayTotal>1700)issues.push('总热量偏高，减脂期注意晚餐和夜宵');
  if(!issues.length)issues.push('今天搭配不错，继续保持 👍');
  const big={protein:cats.protein,veg:cats.veg,grain:cats.grain,fat:cats.fat};
  const bigSum=Object.values(big).reduce((a,x)=>a+x,0)||1;
  const bars=['protein','veg','grain','fat'].map(k=>`<div class="nut-bar"><span class="nb-label">${CAT_NAME[k]}</span><span class="nb-track"><span class="nb-fill" style="width:${Math.round(big[k]/bigSum*100)}%;background:${CAT_COLOR[k]}"></span></span><span class="nb-val">${cats[k]}kcal</span></div>`).join('');
  const detail=[['早餐',b],['午餐',l],['晚餐',d]].map(([nm,p])=>`<div class="meal-line"><b>${nm}</b>：${p.items.length?p.items.map(x=>`${x.name}${x.grams}g·${x.kcal}kcal`).join('、'):'未记录'} <span style="color:var(--sub)">（${p.total}kcal）</span></div>`).join('');
  const balanced=(cats.protein>=250&&cats.veg>=150&&cats.grain<=700&&cats.fat<=400&&dayTotal>=1000&&dayTotal<=1700);
  $('#dietAnalyze').innerHTML=`<div class="da-total">全天约 <b>${dayTotal}</b> kcal <span class="da-target">（减脂参考线 ${DIET_KCAL_TARGET}kcal）</span> ${balanced?'✅ 较均衡':'⚠️ 需改善'}</div>
    <div class="nut-bars">${bars}</div>
    <div class="da-detail">${detail}</div>
    <div class="da-issues"><b>🔎 营养是否均衡：</b>${issues.map(x=>`<div class="da-issue">· ${x}</div>`).join('')}</div>`;
  DB.dietLog=DB.dietLog||{};
  DB.dietLog[date]={b:$('#mealInB').value,l:$('#mealInL').value,d:$('#mealInD').value,total:dayTotal};
  saveDB(); renderDietLog();
  toast('已分析并保存 '+date);
}
function renderDietLog(){
  DB.dietLog=DB.dietLog||{};
  const keys=Object.keys(DB.dietLog).sort().reverse().slice(0,7);
  $('#dietLogHistory').innerHTML = keys.length? '<div class="dlh-title">📅 近期记录</div>'+keys.map(k=>{const r=DB.dietLog[k];const v=(r.total>=1000&&r.total<=1700)?'✅':'⚠️';return `<div class="dlh-row"><span>${k.slice(5)}</span><span>${v} ${r.total}kcal</span></div>`;}).join('') : '';
}

/* ===== 4. 运动减肥 ===== */
const BODY={weight:66.5,height:155,hip:102,waist:82,thigh:63,type:'梨型'};
const WORKOUT_VIDEOS=[
  {t:'帕梅拉 12分钟侧臀训练（改善假胯宽）',trainer:'帕梅拉',target:'臀腿',bvid:'BV1Zv4y1N7hj',note:'膝盖友好，无深蹲跳跃'},
  {t:'帕梅拉 15分钟低冲击瘦腿',trainer:'帕梅拉',target:'瘦腿',bvid:'BV1N541137AH',note:'不伤膝，适合日常'},
  {t:'欧阳春晓 芭杆上肢雕刻（改善圆肩驼背）',trainer:'欧阳春晓',target:'瘦背',bvid:'BV1Gz421C7G1',note:'坐着也能练，改善圆肩'},
  {t:'欧阳春晓 丝滑美背（弹力带肩背）',trainer:'欧阳春晓',target:'瘦背',bvid:'BV1uCoRYHE1v',note:'消除斜方肌'},
  {t:'欧阳春晓 站立沙漏腰2.0',trainer:'欧阳春晓',target:'瘦腰',bvid:'BV1xr421b7iJ',note:'收紧侧腰'},
  {t:'韩小四 瘦腿合集（B站搜索）',trainer:'韩小四',target:'瘦腿',search:'韩小四 瘦腿 无跑跳',note:'点开在B站看正确视频'},
  {t:'jo姐 踏步燃脂训练',trainer:'jo姐',target:'有氧',bvid:'BV1ov4y1K7yt',note:'对新手/膝盖友好，快乐燃脂'},
  {t:'Mady Morrison 15分钟全身拉伸',trainer:'拉伸',target:'拉伸',bvid:'BV15V411a7cV',note:'运动后必做，防肌肉腿'}
];
/* 运动视频旋转推荐池（核心博主：帕梅拉/欧阳春晓/jo姐/韩小四 + 拉伸），不断推荐、带打卡 */
const WORKOUT_RECS=[
  {t:'帕梅拉 12分钟侧臀训练（改善假胯宽）',trainer:'帕梅拉',target:'臀腿',bvid:'BV1Zv4y1N7hj',note:'膝盖友好，无深蹲跳跃'},
  {t:'帕梅拉 15分钟低冲击瘦腿',trainer:'帕梅拉',target:'瘦腿',bvid:'BV1N541137AH',note:'不伤膝，适合日常'},
  {t:'帕梅拉 20分钟全身燃脂',trainer:'帕梅拉',target:'有氧',search:'帕梅拉 20分钟全身燃脂',note:'暴汗有氧，全身都动'},
  {t:'帕梅拉 天鹅臂（瘦手臂）',trainer:'帕梅拉',target:'瘦臂',search:'帕梅拉 天鹅臂',note:'消灭拜拜肉'},
  {t:'欧阳春晓 芭杆上肢雕刻（改善圆肩驼背）',trainer:'欧阳春晓',target:'瘦背',bvid:'BV1Gz421C7G1',note:'坐着也能练，改善圆肩'},
  {t:'欧阳春晓 丝滑美背（弹力带肩背）',trainer:'欧阳春晓',target:'瘦背',bvid:'BV1uCoRYHE1v',note:'消除斜方肌'},
  {t:'欧阳春晓 站立沙漏腰2.0',trainer:'欧阳春晓',target:'瘦腰',bvid:'BV1xr421b7iJ',note:'收紧侧腰'},
  {t:'欧阳春晓 漫画腿（无跑跳）',trainer:'欧阳春晓',target:'瘦腿',search:'欧阳春晓 漫画腿',note:'躺着瘦腿，梨型友好'},
  {t:'欧阳春晓 蜜桃臀',trainer:'欧阳春晓',target:'臀腿',search:'欧阳春晓 蜜桃臀',note:'翘臀不粗腿'},
  {t:'韩小四 瘦腿合集（B站搜索）',trainer:'韩小四',target:'瘦腿',search:'韩小四 瘦腿 无跑跳',note:'点开在B站看正确视频'},
  {t:'韩小四 瘦肚子',trainer:'韩小四',target:'瘦腰',search:'韩小四 瘦肚子',note:'针对小肚腩'},
  {t:'jo姐 踏步燃脂训练',trainer:'jo姐',target:'有氧',bvid:'BV1ov4y1K7yt',note:'对新手/膝盖友好，快乐燃脂'},
  {t:'jo姐 快乐燃脂舞',trainer:'jo姐',target:'有氧',search:'jo姐 燃脂舞',note:'边跳边燃，不枯燥'},
  {t:'周六野 瘦腿操',trainer:'周六野',target:'瘦腿',search:'周六野 瘦腿',note:'新手友好，跟练轻松'},
  {t:'Mady Morrison 15分钟全身拉伸',trainer:'拉伸',target:'拉伸',bvid:'BV15V411a7cV',note:'运动后必做，防肌肉腿'},
  {t:'Mady Morrison 晨起拉伸',trainer:'拉伸',target:'拉伸',search:'Mady Morrison 晨间拉伸',note:'唤醒身体，晨练前做'}
];
const WEEK_PLAN=[
  ['帕梅拉 15分钟低冲击瘦腿','欧阳春晓 站立沙漏腰2.0','Mady Morrison 15分钟全身拉伸'],
  ['jo姐 踏步燃脂训练','欧阳春晓 芭杆上肢雕刻（改善圆肩驼背）','Mady Morrison 15分钟全身拉伸'],
  ['帕梅拉 12分钟侧臀训练（改善假胯宽）','欧阳春晓 丝滑美背（弹力带肩背）','Mady Morrison 15分钟全身拉伸'],
  ['jo姐 踏步燃脂训练','韩小四 瘦腿合集（B站搜索）','Mady Morrison 15分钟全身拉伸'],
  ['帕梅拉 15分钟低冲击瘦腿','欧阳春晓 站立沙漏腰2.0','Mady Morrison 15分钟全身拉伸'],
  ['帕梅拉 12分钟侧臀训练（改善假胯宽）','欧阳春晓 芭杆上肢雕刻（改善圆肩驼背）','Mady Morrison 15分钟全身拉伸'],
  ['jo姐 踏步燃脂训练','韩小四 瘦腿合集（B站搜索）','Mady Morrison 15分钟全身拉伸']
];
function findVideo(title){ return WORKOUT_VIDEOS.find(v=>v.t===title) || WORKOUT_VIDEOS.find(v=>title.includes(v.trainer)&&title.includes(v.target)) || null; }
function embedVideo(v){
  if(v.bvid) return `<div class="v-cover" data-bvid="${esc(v.bvid)}" data-title="${esc(v.t)}" onclick="playWorkoutVideo(this)"><div class="v-play">▶</div><div class="v-cover-t">${esc(v.t)}</div><div class="v-cover-hint">点击播放 · 同时只放一个 · 离开自动停</div></div>`;
  if(v.search) return `<a href="https://search.bilibili.com/all?keyword=${encodeURIComponent(v.search)}" target="_blank" class="v-note">▶ 在B站打开「${esc(v.search)}」</a>`;
  return '';
}
function playWorkoutVideo(el){
  if(el.classList.contains('playing')) return;
  // 同一时间只允许一个视频在播：先停掉其它正在播放的
  document.querySelectorAll('#workoutRecList .v-cover.playing').forEach(c=>{ if(c!==el) resetWorkoutCover(c); });
  const bvid=el.getAttribute('data-bvid');
  el.classList.add('playing');
  el.innerHTML=`<iframe src="https://player.bilibili.com/player.html?bvid=${bvid}&page=1&high_quality=1&danmaku=0&autoplay=1" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
}
function resetWorkoutCover(el){
  const bvid=el.getAttribute('data-bvid'), title=el.getAttribute('data-title');
  el.classList.remove('playing');
  el.innerHTML=`<div class="v-play">▶</div><div class="v-cover-t">${esc(title)}</div><div class="v-cover-hint">点击播放 · 同时只放一个 · 离开自动停</div>`;
}
function pauseAllWorkoutVideos(){ document.querySelectorAll('#workoutRecList .v-cover.playing').forEach(c=>resetWorkoutCover(c)); }
function dayWorkoutDone(title){ const d=todayStr(); const m=(DB.workout.items&&DB.workout.items[d])||{}; return !!m[title]; }
function renderWorkoutToday(){
  const dow=new Date().getDay(); const idx=(dow===0?6:dow-1);
  const plan=WEEK_PLAN[idx];
  const html=plan.map((t,i)=>{ const v=findVideo(t); const done=dayWorkoutDone(t);
    const ic = i===0 ? (dayWorkoutDone('爬坡走')?'🚶✅':'🚶') : (done?'🎬✅':'🎬');
    return `<div class="wo-item"><div class="wo-ic">${ic}</div><div class="wo-main"><div class="wo-title">${i===0?'爬坡走（尽量完成，也可能没完成）':esc(t)}</div><div class="wo-sub">${i===0?'坡度12% · 速度4-4.5 · 30分钟 · 边走边听播客':(v?v.note:'')}</div></div>${i===0?`<button class="wo-check ${dayWorkoutDone('爬坡走')?'on':''}" onclick="checkWorkoutItem('爬坡走')">${dayWorkoutDone('爬坡走')?'✓ 已打卡':'✓ 完成打卡'}</button>`:`<button class="wo-check ${done?'on':''}" onclick="checkWorkoutItem('${esc(t)}')">${done?'✓ 已打卡':'✓ 完成打卡'}</button>`}</div>`; }).join('');
  $('#workoutToday').innerHTML=html + `<div style="font-size:12px;color:var(--sub);margin-top:6px">💡 爬坡尽量完成，没完成也没关系；其他训练点「完成打卡」记录。坚持比强度重要。</div>`;
}
function checkWorkoutItem(title){ const d=todayStr(); DB.workout.items=DB.workout.items||{}; DB.workout.items[d]=DB.workout.items[d]||{};
  const now=!DB.workout.items[d][title]; DB.workout.items[d][title]=now; saveDB();
  if(now) toast('「'+title+'」已打卡 ✓'); else toast('已取消打卡');
  renderWorkoutToday(); renderWorkoutRec();
}
function renderWorkoutRec(){
  const box=$('#workoutRecList'); if(!box)return;
  const {list}=pickRecs(WORKOUT_RECS,'workout',8);
  if(!list.length){ box.innerHTML='<div class="rec-sub">🎉 训练视频都练过啦！等每周二补充新内容。</div>'; return; }
  box.innerHTML=`<div class="rec-sub">🔥 优先推没练过的 · 练过超${FORGET_DAYS}天复习重推 · 点「完成打卡」记录</div>`+list.map(r=>{
    const it=r.it; const id=recId('workout',it); const done=dayWorkoutDone(it.t);
    const rev=r.review?'<span class="rec-rev">🔁复习</span>':'';
    return `<div class="rec-card ${r.review?'is-review':''}"><div class="rec-ct"><span class="rec-type">${esc(it.trainer)}·${esc(it.target)}</span>${rev}</div><div class="rec-rt">${esc(it.t)}</div><div class="rec-rn">${esc(it.note)}</div>${embedVideo(it)}<button class="rec-btn done ${done?'on':''}" onclick="checkWorkoutItem('${esc(it.t)}')">${done?'✓ 已打卡':'✓ 完成打卡'}</button></div>`;
  }).join('');
}

/* ===== 5. 语言学习 ===== */
const LANG={
  en:{name:'英语',goal:'冲母语级',tasks:[
    {ic:'📖',t:'读《神奇书屋》3页并朗读',d:'分级读物，可理解输入，每周约20页'},
    {ic:'🎧',t:'听 BBC 6 Minute English 1期',d:'B站有搬运，搜"6 minute english"'},
    {ic:'🔤',t:'背15个单词（用APP或卡片）',d:'从今天接触到的生词里挑'},
    {ic:'🎬',t:'看1集无字幕/英字美剧10分钟',d:'Friends/Modern Family'}
  ],videos:[
    {t:'英语兔 · 语法/发音干货',search:'英语兔',note:'B站头部英语UP主，系统易懂'},
    {t:'English with Lucy',search:'English with Lucy bilibili',note:'英式英语自然输入'},
    {t:'TED-Ed 动画',search:'TED-Ed 中文字幕',note:'短小知识类，练听力'}
  ]},
  ja:{name:'日语',goal:'N2→N1 冲母语级',tasks:[
    {ic:'📺',t:'看 NHKニュース 1条（ Web Easy 起步）',d:'可理解新闻输入'},
    {ic:'📚',t:'读青空文庫短文1篇',d:'免费公版小说，原生素材'},
    {ic:'🔤',t:'记10个N1词汇',d:'用红宝书/APP'},
    {ic:'🎬',t:'看半集日剧（日文字幕）',d:'巩固语感'}
  ],videos:[
    {t:'费昂那 · 日语听力口语练习',url:'https://space.bilibili.com/5378802/upload/video',note:'固定：UP主听力口语专项，跟练发音与反应',pin:true},
    {t:'N1真题听力·即时应答',url:'https://www.bilibili.com/video/BV1J94y1d79B/',note:'固定：N1听解 即时应答 真题精听',pin:true},
    {t:'N1真题听力·其他题型',url:'https://www.bilibili.com/video/BV1HU4y1i7Xa/',note:'固定：N1听解 课题理解/要点理解等',pin:true},
    {t:'YUYUの日本語 Podcast',url:'https://www.youtube.com/@yuyunihongopodcast',note:'固定：日本主播播客，每期20-30min聊日本文化/生活，发音清晰带日文字幕，磨耳朵神器',pin:true},
    {t:'yutube搬运工 · 日语听力素材',url:'https://space.bilibili.com/1665136030',note:'固定：UP主搬运大量日语原声/综艺/动漫听力素材，练听力宝库',pin:true},
    {t:'秋山燿平 · 日语地道表达',search:'秋山燿平',note:'在日本日本人，讲自然日语'},
    {t:'Hero3046 · JLPT语法',search:'Hero3046',note:'N1语法讲解清晰'},
    {t:'Haru日语咖啡厅',url:'https://space.bilibili.com/1809415986/upload/video',note:'固定：B站日语听力口语/会话练习，氛围轻松像咖啡厅闲聊',pin:true}
  ]},
  ko:{name:'韩语',goal:'爱好入门',tasks:[
    {ic:'🔤',t:'学40音 1行（元音/辅音）',d:'先认完字再谈输入'},
    {ic:'🎵',t:'跟唱1首K-pop（看歌词）',d:'兴趣驱动'},
    {ic:'📺',t:'看1集韩综/韩剧片段',d:'磨耳朵'}
  ],videos:[
    {t:'Talk To Me In Korean',search:'TTMIK 韩语',note:'最系统零基础教材'},
    {t:'韩语养乐多',search:'韩语养乐多',note:'有趣入门'}
  ]}
};
/* ===== 通用推荐引擎：看过/完成打卡 + 遗忘周期重推 ===== */
const FORGET_DAYS=21; // 看过超过21天，作为“复习”重新推送（人会遗忘）
function recId(type,it){ return type+':'+(it.key||it.id||it.t); }
function pickRecs(pool,type,n){
  const now=Date.now(); const F=FORGET_DAYS*86400000; const v=DB.views||{};
  const fresh=[]; const review=[];
  pool.forEach(it=>{
    const id=recId(type,it); const s=v[id];
    if(!s) fresh.push({it,id,review:false});
    else if(!s.skip && (now-s.ts)>F) review.push({it,id,review:true});
  });
  const list=fresh.concat(review).slice(0,n);
  return {list, freshCount:fresh.length, reviewCount:review.length};
}
function recBtns(type,id,review){
  return `<div class="rec-acts"><button class="rec-btn done" onclick="markView('${type}','${esc(id)}',false)">✓ ${review?'复习完':'看过/完成'}</button><button class="rec-btn skip" onclick="markView('${type}','${esc(id)}',true)">⊘ 不想看</button></div>`;
}
function markView(type,id,skip){
  DB.views=DB.views||{};
  DB.views[id]={ts:Date.now(),skip:!!skip};
  saveDB();
  if(type==='ja'||type==='en') renderLang();
  if(type==='beauty') renderBeauty();
  if(type==='workout') renderWorkoutRec();
  toast(skip?'已标记“不想看”，之后不再推 ✓':'已记录：看过/完成 ✓');
}
/* 日语学习材料推荐池：每日按日期轮换推送，热血优先，混搭综艺/日剧/播客 */
const JA_RECOMMEND=[
  {t:'进击的巨人',type:'热血动漫',note:'你已看·史诗级热血，补全后期或二刷都行',key:'进击的巨人',fav:true},
  {t:'咒术回战',type:'热血动漫',note:'你已看·作画炸裂的王道热血',key:'咒术回战',fav:true},
  {t:'银魂',type:'热血动漫',note:'你已看·热血+无厘头+燃泪，长篇神作',key:'银魂',fav:true},
  {t:'大剑 Claymore',type:'热血动漫',note:'你已看·黑暗奇幻热血，女性主角硬核',key:'大剑 Claymore',fav:true},
  {t:'异度入侵 ID:INVADED',type:'科幻推理',note:'你已看·烧脑意境，推理+动作',key:'异度入侵 ID:INVADED',fav:true},
  {t:'鬼灭之刃',type:'热血动漫',note:'燃系热血，画风绝美，呼吸法打戏封神',key:'鬼灭之刃',fav:true},
  {t:'钢之炼金术师FA',type:'热血动漫',note:'公认神作，热血+深度+无坑结局',key:'钢之炼金术师 最终炼成',fav:true},
  {t:'我的英雄学院',type:'热血动漫',note:'王道校园英雄热血，角色塑造强',key:'我的英雄学院',fav:true},
  {t:'一拳超人',type:'热血动漫',note:'热血+极致吐槽，打戏经费爆炸',key:'一拳超人',fav:true},
  {t:'电锯人',type:'热血动漫',note:'近年黑暗热血神番， MAPPA 制作',key:'电锯人',fav:true},
  {t:'东京喰种',type:'热血动漫',note:'黑暗成长向热血，前期神级',key:'东京喰种',fav:true},
  {t:'排球少年',type:'热血动漫',note:'运动番天花板，燃到爆的团队热血',key:'排球少年',fav:true},
  {t:'灵能百分百',type:'热血动漫',note:'ONE老师原作，热血+搞笑+超能力',key:'灵能百分百',fav:true},
  {t:'JoJo的奇妙冒险',type:'热血动漫',note:'独特美学+热血替身战，名场面宝库',key:'JoJo的奇妙冒险',fav:true},
  {t:'死神 BLEACH 千年血战',type:'热血动漫',note:'经典热血回归，久保带人画风',key:'死神 千年血战篇',fav:true},
  {t:'火影忍者',type:'热血动漫',note:'经典忍者热血长篇，鸣人成长史',key:'火影忍者',fav:true},
  {t:'海贼王',type:'热血动漫',note:'长篇冒险热血，世界观宏大',key:'海贼王',fav:true},
  {t:' Fate/stay night 命运之夜',type:'热血动漫',note:'圣杯战争，型月神作',key:'Fate stay night',fav:true},
  {t:'弥留之国的爱丽丝',type:'日剧/漫改',note:'生存游戏高热血，紧张刺激',key:'弥留之国的爱丽丝',fav:true},
  {t:'半泽直树',type:'日剧',note:'职场复仇热血，「以牙还牙」名梗',key:'半泽直树',fav:true},
  {t:'非自然死亡 Unnatural',type:'日剧',note:'医疗推理热血职场，石原里美主演',key:'非自然死亡 Unnatural',fav:true},
  {t:'轮到你了',type:'日剧',note:'悬疑神剧，反转不断',key:'轮到你了 日剧',fav:false},
  {t:'从周一开始熬夜',type:'日本综艺',note:'你点名的月曜夜ふかし，街头采访搞笑又真实',key:'月曜から夜ふかし',fav:false},
  {t:'闲走日本 ブラタモリ',type:'日本综艺',note:'塔摩利带你逛地理与历史，增长文化背景',key:'ブラタモリ',fav:false},
  {t:'人类观察 Monitoring',type:'日本综艺',note:'整人式观察综艺，笑点密集',key:'モニタリング 人間観察',fav:false},
  {t:'水曜日のダウンタウン',type:'日本综艺',note:'脑洞企划综艺，结论常常反常识',key:'水曜日のダウンタウン',fav:false},
  {t:'アメトーーク',type:'日本综艺',note:'艺人畅谈专题，日语口语浸入好素材',key:'アメトーーク',fav:false},
  {t:'マツコの知らない世界',type:'日本综艺',note:'知识类综艺，拓宽日本社会认知',key:'マツコの知らない世界',fav:false},
  {t:'千鳥の鬼レンチャン',type:'日本综艺',note:'音乐合唱综艺，听歌练耳',key:'千鳥の鬼レンチャン',fav:false},
  {t:'中村Radio（喜马拉雅）',type:'播客听力',note:'日籍外教多人对话，纯泛听磨耳朵',key:'中村Radio 日语',fav:false},
  {t:'NHK News Web Easy',type:'播客听力',note:'慢速标假名新闻，听力+时事双收',key:'NHK News Web Easy',fav:false},
  {t:'日本語の森',type:'播客听力',note:'系统语法讲解，JLPT 备考向',key:'日本語の森',fav:false},
  {t:'春に聞く Japanese Podcast',type:'播客听力',note:'慢速日语聊天，适合跟读',key:'春に聞く 日本語ポッドキャスト',fav:false},
  {t:'堀与宫村',type:'恋爱动漫',note:'校园甜恋，节奏舒服不拖沓',key:'堀与宫村',fav:false},
  {t:'辉夜大小姐想让我告白',type:'恋爱动漫',note:'恋爱+智斗搞笑，高浓度糖分',key:'辉夜大小姐想让我告白',fav:false},
  {t:'青春猪头少年',type:'恋爱动漫',note:'恋爱+致郁+治愈，剧情神转折',key:'青春猪头少年',fav:false}
];
function renderJaRecommend(){
  const box=$('#jaRecommend'); if(!box)return;
  const {list}=pickRecs(JA_RECOMMEND,'ja',8);
  if(!list.length){ box.innerHTML='<div class="rec-sub">🎉 日语推荐你都看遍啦！等每周二补充新内容，或点「不想看」里误标的删掉。</div>'; return; }
  box.innerHTML=`<div class="rec-sub">🔥 优先推没看过的 · 看过超${FORGET_DAYS}天会作为「🔁复习」重推 · 点「不想看」永不再推</div>`+list.map(r=>{
    const it=r.it; const id=recId('ja',it);
    const href=it.url||('https://search.bilibili.com/all?keyword='+encodeURIComponent(it.key||it.t));
    const tag=it.fav?'<span class="rec-fav">♨热血</span>':'';
    const rev=r.review?'<span class="rec-rev">🔁复习</span>':'';
    return `<div class="rec-card ${r.review?'is-review':''}"><div class="rec-ct"><span class="rec-type">${esc(it.type)}</span>${tag}${rev}</div><div class="rec-rt">${esc(it.t)}</div><div class="rec-rn">${esc(it.note)}</div><a href="${href}" target="_blank" class="rec-link">▶ 去看/搜</a>${recBtns('ja',id,r.review)}</div>`;
  }).join('');
}
/* 英语学习材料推荐池：每日按日期轮换推送，你点名的优先 */
const EN_RECOMMEND=[
  {t:'绝望主妇 Desperate Housewives',type:'美剧',note:'你点名·生活化口语+强剧情，练听力神器',key:'绝望主妇 美剧 双语',fav:true},
  {t:'使女的故事 The Handmaid\'s Tale',type:'美剧',note:'你点名·反乌托邦悬疑，台词考究有张力',key:'使女的故事 美剧',fav:true},
  {t:'老友记 Friends',type:'美剧',note:'经典地道口语，情景喜剧入门首选',key:'老友记 全集',fav:false},
  {t:'摩登家庭 Modern Family',type:'美剧',note:'当代美式家庭日常，词汇实用',key:'摩登家庭 Modern Family',fav:false},
  {t:'办公室 The Office (US)',type:'美剧',note:'职场冷幽默，口语自然',key:'The Office 美版',fav:false},
  {t:'生活大爆炸 The Big Bang Theory',type:'美剧',note:'学术梗+固定搭配，顺便学科学词汇',key:'生活大爆炸',fav:false},
  {t:'破产姐妹 2 Broke Girls',type:'美剧',note:'纽约街头口语，俚语密集',key:'破产姐妹',fav:false},
  {t:'欲望都市 Sex and the City',type:'美剧',note:'女性视角都市剧，表达地道',key:'Sex and the City',fav:false},
  {t:'纸牌屋 House of Cards',type:'美剧',note:'政治职场台词，高级词汇多',key:'House of Cards 纸牌屋',fav:false},
  {t:'王冠 The Crown',type:'英剧',note:'英式英语范本，皇室历史',key:'The Crown 王冠',fav:false},
  {t:'神探夏洛克 Sherlock',type:'英剧',note:'英式快语速，推理台词漂亮',key:'神探夏洛克 Sherlock',fav:false},
  {t:'唐顿庄园 Downton Abbey',type:'英剧',note:'英伦古典礼仪英语，优雅',key:'Downton Abbey',fav:false},
  {t:'绝命毒师 Breaking Bad',type:'美剧',note:'剧情神作，角色对白张力强',key:'Breaking Bad 绝命毒师',fav:false},
  {t:'权力的游戏 Game of Thrones',type:'美剧',note:'史诗级，词汇量大',key:'Game of Thrones',fav:false},
  {t:'怪奇物语 Stranger Things',type:'美剧',note:'复古风+青少年口语',key:'Stranger Things',fav:false},
  {t:'西部世界 Westworld',type:'美剧',note:'科幻哲学向，台词有深度',key:'Westworld 西部世界',fav:false},
  {t:'金装律师 Suits',type:'美剧',note:'律政职场，商务英语模板',key:'Suits 金装律师',fav:false},
  {t:'实习医生格蕾 Grey\'s Anatomy',type:'美剧',note:'医疗职场，专业词汇+情感戏',key:'Grey\'s Anatomy',fav:false},
  {t:'黑镜 Black Mirror',type:'英剧',note:'单元剧科幻，社会议题词汇',key:'Black Mirror',fav:false},
  {t:'阿甘正传 Forrest Gump',type:'电影',note:'励志经典，口语纯正',key:'Forrest Gump 阿甘正传',fav:false},
  {t:'当幸福来敲门',type:'电影',note:'励志，职场+亲情口语',key:'当幸福来敲门',fav:false},
  {t:'肖申克的救赎',type:'电影',note:'影史神作，台词隽永',key:'肖申克的救赎',fav:false},
  {t:'盗梦空间 Inception',type:'电影',note:'诺兰烧脑，逻辑词汇',key:'Inception 盗梦空间',fav:false},
  {t:'疯狂动物城 Zootopia',type:'电影',note:'动画电影，清晰易懂',key:'Zootopia 疯狂动物城',fav:false},
  {t:'寻梦环游记 Coco',type:'电影',note:'温情动画，词汇友好',key:'Coco 寻梦环游记',fav:false},
  {t:'BBC 6 Minute English',type:'播客听力',note:'每期6分钟，商务/生活话题，BBC官方',key:'BBC 6 Minute English',fav:false},
  {t:'TED Talks',type:'演讲/听力',note:'各主题演讲，练听力+积累观点',key:'TED Talks 中英字幕',fav:false},
  {t:'VOA 慢速英语',type:'播客听力',note:'慢速新闻，适合初级阶段',key:'VOA 慢速英语',fav:false},
  {t:'Luke\'s English Podcast',type:'播客听力',note:'英式幽默聊天，轻松磨耳朵',key:'Luke\'s English Podcast',fav:false},
  {t:'BBC Learning English',type:'播客听力',note:'官方教学，语法词汇系统',key:'BBC Learning English',fav:false}
];
function renderEnRecommend(){
  const box=$('#enRecommend'); if(!box)return;
  const {list}=pickRecs(EN_RECOMMEND,'en',8);
  if(!list.length){ box.innerHTML='<div class="rec-sub">🎉 英语推荐你都看遍啦！等每周二补充新内容。</div>'; return; }
  box.innerHTML=`<div class="rec-sub">🔥 优先推没看过的 · 看过超${FORGET_DAYS}天会作为「🔁复习」重推 · 点「不想看」永不再推</div>`+list.map(r=>{
    const it=r.it; const id=recId('en',it);
    const href=it.url||('https://search.bilibili.com/all?keyword='+encodeURIComponent(it.key||it.t));
    const tag=it.fav?'<span class="rec-fav">⭐点名</span>':'';
    const rev=r.review?'<span class="rec-rev">🔁复习</span>':'';
    return `<div class="rec-card ${r.review?'is-review':''}"><div class="rec-ct"><span class="rec-type">${esc(it.type)}</span>${tag}${rev}</div><div class="rec-rt">${esc(it.t)}</div><div class="rec-rn">${esc(it.note)}</div><a href="${href}" target="_blank" class="rec-link">▶ 去看/搜</a>${recBtns('en',id,r.review)}</div>`;
  }).join('');
}
let curLang='en';
function switchLang(btn){ $$('.ltab').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); curLang=btn.dataset.lang; renderLang(); }
function renderLang(){ const L=LANG[curLang]; const saved=DB.language.filter(x=>x.lang===L.name&&x.date===todayStr());
  $('#langTasks').innerHTML=L.tasks.map(t=>`<div class="lt-item"><span class="lt-ic">${t.ic}</span><div class="lt-main"><div class="lt-t">${esc(t.t)}</div><div class="lt-d">${esc(t.d)}</div></div><input type="checkbox"></div>`).join('');
  $('#langVideos').innerHTML=L.videos.map(v=>{
    const href=v.url?v.url:('https://search.bilibili.com/all?keyword='+encodeURIComponent(v.search));
    const label=v.url?(v.url.indexOf('youtube')>-1?'▶ 在YouTube订阅/收听':(v.url.indexOf('/space/')>-1?'▶ 进入UP主主页':'▶ 在B站观看')):'▶ 在B站打开';
    return `<div class="v-card"><div class="v-title">${v.pin?'🔒 ':''}${esc(v.t)}</div><div class="v-meta">${esc(v.note)}</div><a href="${href}" target="_blank" class="v-note" style="display:block;padding:0 10px 10px;color:var(--orange-d)">${label}</a></div>`;
  }).join('');
  $('#langRecList').innerHTML=saved.length?saved.map(x=>`<div class="rec-item"><span>${x.min}分钟 · ${esc(x.content)}</span></div>`).join(''):'<div class="hint">今天还没记录</div>';
  const recCard=$('#jaRecommendCard'); if(recCard) recCard.style.display=(curLang==='ja')?'block':'none';
  const enCard=$('#enRecommendCard'); if(enCard) enCard.style.display=(curLang==='en')?'block':'none';
  if(curLang==='ja') renderJaRecommend();
  if(curLang==='en') renderEnRecommend();
}
function saveLangRec(){ const name=$('#langRecName').value; const min=parseInt($('#langRecMin').value)||0; const content=$('#langRecContent').value.trim(); if(!content){toast('请填学习内容');return;} DB.language.push({date:todayStr(),lang:name,min,content}); $('#langRecMin').value=''; $('#langRecContent').value=''; saveDB(); if(name===LANG[curLang].name)renderLang(); toast('已记录'); }

/* ===== 6. 个人记账 ===== */
const FIN_CATS=['餐饮','购物','护肤','健身','学习','交通','居住','医疗','娱乐','其他'];
const FIN_CATS_INC=['工资','兼职','理财收益','红包','其他'];
function finCatOptions(type){ const arr=type==='收入'?FIN_CATS_INC:FIN_CATS; return arr.map(c=>`<option ${c===$('#finCat').value?'selected':''}>${c}</option>`).join(''); }
function initFinSelects(){ $('#finCat').innerHTML=finCatOptions('支出'); $('#recCat').innerHTML=FIN_CATS.map(c=>`<option>${c}</option>`).join(''); $('#finType').onchange=()=>{ $('#finCat').innerHTML=finCatOptions($('#finType').value); }; }
function addFinance(){ const type=$('#finType').value; const cat=$('#finCat').value; const amt=parseFloat($('#finAmt').value); const note=$('#finNote').value.trim(); const date=$('#finDate').value||todayStr(); if(!amt){toast('请输入金额');return;} DB.finance.push({id:uid(),date,type,cat,amt,note}); $('#finAmt').value=''; $('#finNote').value=''; saveDB(); renderFinanceStats(); renderFinance(); renderAsset(); toast('已记录'); }
function monthFin(m){ return DB.finance.filter(x=>x.date.slice(0,7)===m); }
function renderFinanceStats(){ const m=todayStr().slice(0,7); const mf=monthFin(m); const exp=mf.filter(x=>x.type==='支出').reduce((s,x)=>s+x.amt,0); const inc=mf.filter(x=>x.type==='收入').reduce((s,x)=>s+x.amt,0);
  const bud=DB.budget||3000; const left=bud-exp;
  $('#financeStats').innerHTML=`
    <div class="fs-item exp"><div class="v">¥${exp.toFixed(0)}</div><div class="l">本月支出</div></div>
    <div class="fs-item inc"><div class="v">¥${inc.toFixed(0)}</div><div class="l">本月收入</div></div>
    <div class="fs-item bud"><div class="v">¥${left.toFixed(0)}</div><div class="l">预算剩余(¥${bud})</div></div>
    <div class="fs-item"><div class="v">${mf.length}</div><div class="l">本月笔数</div></div>`;
  if(left<0) toast('⚠️ 本月预算已超支 ¥'+(-left).toFixed(0));
}
let finPieChart=null,finTrendChart=null;
function renderFinance(){
  const m=$('#finFilterMonth').value||todayStr().slice(0,7);
  const kw=($('#finFilterKw').value||'').toLowerCase();
  let list=monthFin(m);
  if(kw) list=list.filter(x=>(x.note+x.cat).toLowerCase().includes(kw));
  list.sort((a,b)=>b.date.localeCompare(a.date));
  $('#financeList').innerHTML=list.length?list.map(x=>`<div class="fin-row"><span>${x.date.slice(5)}</span><span class="fcat">${x.cat}</span><span>${esc(x.note)||'—'}</span><span class="famt ${x.type==='收入'?'inc':'exp'}">${x.type==='收入'?'+':'-'}¥${x.amt.toFixed(2)}</span><button class="fdel" onclick="delFin('${x.id}')">×</button></div>`).join(''):'<div class="hint">本月暂无记录</div>';
  // 饼图
  const byCat={}; monthFin(m).filter(x=>x.type==='支出').forEach(x=>byCat[x.cat]=(byCat[x.cat]||0)+x.amt);
  const ctx=$('#finPie'); if(finPieChart)finPieChart.destroy();
  finPieChart=new Chart(ctx,{type:'doughnut',data:{labels:Object.keys(byCat),datasets:[{data:Object.values(byCat),backgroundColor:['#ff8c42','#3bb89a','#5aa9e6','#ff7eb3','#f6b93b','#9b8579','#e17055','#a29bfe','#00cec9','#ddd']}]},options:{plugins:{legend:{position:'right',font:{size:10}}}}});
  // 趋势
  const months=[]; for(let i=5;i>=0;i--){ const d=new Date(); d.setMonth(d.getMonth()-i); months.push(d.toISOString().slice(0,7)); }
  const expArr=months.map(mo=>DB.finance.filter(x=>x.date.slice(0,7)===mo&&x.type==='支出').reduce((s,x)=>s+x.amt,0));
  const incArr=months.map(mo=>DB.finance.filter(x=>x.date.slice(0,7)===mo&&x.type==='收入').reduce((s,x)=>s+x.amt,0));
  const ctx2=$('#finTrend'); if(finTrendChart)finTrendChart.destroy();
  finTrendChart=new Chart(ctx2,{type:'line',data:{labels:months.map(m=>m.slice(2)),datasets:[{label:'支出',data:expArr,borderColor:'#e17055',fill:false},{label:'收入',data:incArr,borderColor:'#3bb89a',fill:false}]},options:{plugins:{legend:{font:{size:10}}}}});
}
function delFin(id){ DB.finance=DB.finance.filter(x=>x.id!==id); saveDB(); renderFinanceStats(); renderFinance(); renderAsset(); }
function addRecurring(){ const name=$('#recName').value.trim(); const amt=parseFloat($('#recAmt').value); const day=parseInt($('#recDay').value); const cat=$('#recCat').value; if(!name||!amt){toast('请填名称和金额');return;} DB.recurring.push({name,amt,day,cat}); $('#recName').value=''; $('#recAmt').value=''; saveDB(); renderRecurring(); toast('已添加固定账单'); }
function renderRecurring(){ $('#recurringList').innerHTML=DB.recurring.length?DB.recurring.map((r,i)=>`<div class="rec-item"><span>每月${r.day}号 · ${esc(r.name)} · ¥${r.amt} · ${r.cat}</span><button class="rdel" onclick="delRec(${i})">×</button></div>`).join(''):'<div class="hint">暂无固定账单</div>'; }
function delRec(i){ DB.recurring.splice(i,1); saveDB(); renderRecurring(); }
function saveAsset(k,val){ DB.assets[k]=parseFloat(val)||0; saveDB(); renderAsset(); toast('已保存资产'); }
function renderAsset(){ const a=DB.assets; const mkt=window._market||{}; const goldVal=(a.gold||0)*(mkt.goldCny||0);
  if($('#assetCash'))$('#assetCash').value=a.cash||0;
  if($('#assetSavings'))$('#assetSavings').value=a.savings||0;
  if($('#assetStocks'))$('#assetStocks').value=a.stocks||0;
  if($('#assetFunds'))$('#assetFunds').value=a.funds||0;
  if($('#assetGold'))$('#assetGold').value=a.gold||0;
  if($('#assetHuabei'))$('#assetHuabei').value=a.huabei||0;
  if($('#assetCard'))$('#assetCard').value=a.card||0;
  const total=(a.cash||0)+(a.savings||0)+a.stocks+a.funds+goldVal;
  const debt=(a.huabei||0)+(a.card||0);
  const net=total-debt;
  $('#assetSummary').innerHTML=`
    <div class="as-item"><div class="v">¥${(a.cash||0).toFixed(0)}</div><div class="l">电子钱包</div></div>
    <div class="as-item"><div class="v">¥${(a.savings||0).toFixed(0)}</div><div class="l">银行存款</div></div>
    <div class="as-item"><div class="v">¥${a.stocks.toFixed(0)}</div><div class="l">股票(手动)</div></div>
    <div class="as-item"><div class="v">¥${a.funds.toFixed(0)}</div><div class="l">基金(手动)</div></div>
    <div class="as-item"><div class="v">¥${goldVal.toFixed(0)}</div><div class="l">黄金(${(a.gold||0)}g)</div></div>
    <div class="as-item hl"><div class="v">¥${total.toFixed(0)}</div><div class="l">总资产</div></div>
    <div class="as-item debt"><div class="v">¥${debt.toFixed(0)}</div><div class="l">负债(花呗+卡)</div></div>
    <div class="as-item net ${net>=0?'pos':'neg'}"><div class="v">¥${net.toFixed(0)}</div><div class="l">净资产</div></div>`;
  const m=todayStr().slice(0,7); const exp=monthFin(m).filter(x=>x.type==='支出').reduce((s,x)=>s+x.amt,0);
  const deposit=(a.cash||0)+(a.savings||0);
  let hint='填好上方资产/负债，方便我帮你分析。';
  if(debt>0){ hint=`💡 当前负债 <b>¥${debt.toFixed(0)}</b>（花呗 ¥${(a.huabei||0).toFixed(0)} + 信用卡 ¥${(a.card||0).toFixed(0)}）。建议每月先还清欠款再消费，逐步戒掉「先花后还」；<b>净资产 = 总资产 − 负债 = ¥${net.toFixed(0)}</b>。`; }
  else if(exp>0){ const months=deposit/exp; hint=`💡 现有可动用资金约 ¥${deposit.toFixed(0)}，按本月已支出 ¥${exp.toFixed(0)} 估算，可覆盖约 <b>${months.toFixed(1)} 个月</b> 支出。买车前建议先攒到 6 个月备用金。`; }
  else { hint=`💡 现有可动用资金约 ¥${deposit.toFixed(0)}。建议先攒到 6 个月生活备用金，再考虑买车等大支出。`; }
  if($('#assetHint'))$('#assetHint').innerHTML=hint;
}

/* ===== 7. 每日精选（行情+时事+知识） ===== */
const CURRENT_AFFAIRS=[
  {t:'《生态环境法典》8月15日起施行',s:'我国第二部以“法典”命名的法律，5编1242条，10部环保相关法律同时废止。',d:'这是继民法典之后中国第二部法典，标志着生态环保领域进入系统立法阶段。对企业来说，环保合规成本可能上升，但绿色产业（新能源、环保技术）将获得更明确的法律保障；对普通人而言，噪声、排污、生态保护将有更清晰的维权依据。',view:'环保合规变严，对新能源/ESG投资是长线利好；普通人维权有依据，但别指望立竿见影，执行落地还要看地方。',src:'法治日报 / 人民日报'},
  {t:'扩大内需战略实施方案(2026—2030)抓紧制定',s:'发改委明确下半年实施更加积极有为的宏观政策，加快8000亿元政策性金融工具投放。',d:'方案核心是“惠民生+促消费”“投资物+投资人”双结合。意味着未来5年消费补贴、以旧换新、保障性住房、医疗教育投入可能加码；专项债和政策性金融工具加速落地，基建和新基建（算力网、交通、能源）仍是稳增长抓手。',view:'财经博主：消费补贴、以旧换新会加码，家电/汽车/服务消费受益；但“发钱式”刺激不可持续，别当长期利好梭哈。',src:'证券时报 / 国家发改委'},
  {t:'《新型电力系统建设“十五五”规划》印发',s:'明确到2030年初步建成新型电力系统，部署重大工程和重点任务。',d:'风电、光伏、储能、特高压、智能电网是重点。对投资而言，新能源产业链长期受益；居民端可能面临电价市场化改革，峰谷电价差会更大。',view:'硬核科普：峰谷电价差会更大，建议把洗衣机、充电放夜间；储能、虚拟电厂是普通人也能参与的新赛道。',src:'国家能源局'},
  {t:'自动驾驶系统安全要求强制性国标发布',s:'适用于L3/L4级车辆，拟于2027年7月1日正式实施。',d:'这是国内首个针对高度自动驾驶系统的强制性安全标准，明确系统失效、人机交互、数据记录等要求。利好头部智能驾驶供应商，加速L3落地。',view:'车评人：L3真正落地要2027，现在买“自动驾驶”别被宣传忽悠，手还是要放方向盘上。',src:'市场监管总局 / 工信部'},
  {t:'日本发布2026年版《防卫白皮书》',s:'首次单列“新型作战方式”章节，大幅扩充防卫生产与技术基础内容。',d:'白皮书释放日本突破战后体制、加速“再军事化”的信号，年底前可能修订“安保三文件”。将推动亚太军备竞赛升温，对中日经贸和区域安全构成长期风险。',view:'时政博主：东亚军备升温，半导体、军工供应链波动可能传导到手机/车价，留意相关板块。',src:'新华社'},
  {t:'特朗普取消对伊朗打击 美伊启动谈判',s:'霍尔木兹海峡局势反复，国际油价一度大跌超7%。',d:'特朗普政策反复仍是中东最大变量。若美伊达成协议、海峡开放，全球油价和通胀压力将缓解；若谈判破裂，油价可能快速反弹。',view:'宏观博主：油价是最大变量，加油、机票、海淘成本都看霍尔木兹海峡脸色，关注避险资产。',src:'央视新闻 / 每日经济新闻'},
  {t:'西班牙休达移民危机暴露欧盟内部分裂',s:'约5万移民从摩洛哥涌入休达，已致数十人死亡，意大利等国恢复对西班牙边境检查。',d:'申根区建立在成员国相互信任外部边境管控的基础上。此次危机显示，当难民压力来袭时，各国首先恢复本国边境而非共同分担。',view:'国际观察：欧洲右转加速，留学/移民政策可能收紧，有打算的早规划、早准备材料。',src:'澎湃新闻 / 光明日报'},
  {t:'国际刑事法院指控以色列总理反人类罪',s:'指控内塔尼亚胡及前防长蓄意让加沙平民承受死亡与饥饿。',d:'这是国际刑事法院对现任国家领导人最严厉的指控之一，可能限制其国际出行并影响以色列外交。',view:'国际法博主：象征意义大于实质，但反映国际法秩序在承压，多边主义正被单边主义侵蚀。',src:'新华社 / 寰球瞭望'},
  {t:'个人养老金税收优惠试点扩围',s:'税延养老每年1.2万元额度可抵个税，覆盖面进一步扩大。',d:'第三支柱养老提速，长期看减轻基本养老保险压力；对个税税率10%以上人群更划算，可薅税优羊毛。',view:'理财博主：抵税额度有限，更像是“强制储蓄+税优”，别当高收益理财，流动性也差。',src:'人社部 / 财政部'},
  {t:'多地推行商品房“以旧换新”',s:'国企收旧房换新房，意在盘活存量、稳定楼市。',d:'置换链条长，评估价和置换成本是关键；对改善型需求是缓冲，但远未逆转供需。',view:'楼市博主：置换折价可能大，急用钱别硬上，先算清新旧房价差再决定。',src:'各地住建部门'},
  {t:'AI生成内容须标识办法施行',s:'9月起AI生成内容须显式/隐式标识，平台须打标。',d:'治理深度伪造、虚假信息，平台责任明确；对内容生态是净化和规范。',view:'科技博主：对普通人防诈骗有用；对创作者，AI辅助与“生成”的边界仍需细则，别踩线。',src:'国家网信办'},
  {t:'灵活就业人员（外卖骑手等）社保落地',s:'平台须为骑手等缴纳工伤保险等，新就业形态权益保障推进。',d:'填补了平台用工的保障空白，是劳动者权益的重要进步。',view:'职场博主：是进步，但养老/医疗覆盖仍不足，自由职业者自己也要攒“安全垫”。',src:'人社部'},
  {t:'美联储降息预期升温',s:'市场预期年内降息，全球流动性转向。',d:'影响人民币汇率、黄金、美股风险偏好；对新兴市场资金面是利好。',view:'宏观博主：降息利好风险资产，但预期常常落空，别 All in，留好现金。',src:'美联储 / 路透'},
  {t:'国产大模型密集开源',s:'多个国产大模型开源权重，AI应用门槛骤降。',d:'降低中小企业和个人使用AI的成本，推动产业落地与生态繁荣。',view:'AI博主：开源生态起来，普通人用AI成本骤降，早学早受益，别等“完美再开始”。',src:'行业报道'},
  {t:'欧盟碳边境税CBAM进入正式期',s:'2026起对进口钢铁、铝、水泥等高碳产品征税。',d:'倒逼出口企业做碳核算、降碳排，否则关税吃掉利润。',view:'外贸博主：出口企业碳核算要趁早上系统，不然一单利润全交代在关税上。',src:'欧盟委员会'},
  {t:'多地AI素养纳入中小学课程',s:'多地将AI素养写入中小学课程，培养下一代AI能力。',d:'顺应AI时代的人才需求，从基础教育抓起。',view:'教育博主：家长别焦虑，先陪孩子把AI用起来，比报班实在得多。',src:'教育部'}
];
const KNOWLEDGE=[
  {c:'金融',t:'复利效应',s:'每月定投1000元、年化7%，30年后本息合计约121万元。',d:'复利被称为“世界第八大奇迹”。公式 FV = PMT × (((1+r)^n - 1) / r)。时间越长，利息再投资产生的滚雪球效应越惊人，因此越早开始定投越好。',src:'复利公式'},
  {c:'金融',t:'72法则',s:'用72除以年化收益率，可快速估算本金翻倍所需年数。',d:'72法则是复利的简化估算工具。例如年化8%，72÷8=9年翻倍；年化6%则需要12年。它便于心算，但利率极高或极低时会有偏差。',src:'理财通则'},
  {c:'金融',t:'指数基金',s:'沪深300代表A股最大的300家公司，买它等于同时持有中国头部企业的一部分。',d:'指数基金被动跟踪指数，费用低、透明度高。长期来看，宽基指数能分散个股风险，适合没有时间和专业能力的普通投资者定投。',src:'指数编制规则'},
  {c:'心理',t:'蔡格尼克效应',s:'人们对未完成的任务记忆更深。把任务写下来并勾选完成，能减轻大脑负担。',d:'1927年心理学家蔡格尼克发现，未完成的任务会在脑中形成“张力”，占用工作记忆。GTD、待办清单正是利用这一原理，把任务外化，让大脑释放认知资源。',src:'Zeigarnik, 1927'},
  {c:'心理',t:'损失厌恶',s:'失去100元带来的痛苦，比得到100元的快乐更强烈。',d:'Kahneman和Tversky的前景理论指出，人们对损失的敏感度约为收益的2-2.5倍。这解释了为什么止损难、投资被套牢后不愿割肉，也解释了为什么扣工资比发奖金更刺激人。',src:'Kahneman & Tversky, 1979'},
  {c:'健康',t:'大脑每日保养',s:'《柳叶刀·健康长寿》2025综述指出，维护大脑健康每天约需7小时睡眠、45–60分钟运动、规律用餐和约1小时社交。',d:'这项综述综合了多项研究，强调大脑健康不是单一因素决定，而是睡眠、运动、营养、社交、认知训练的综合结果。对熬夜、久坐、饮食不规律的人尤其有警示意义。',src:'Lancet Healthy Longevity, 2025'},
  {c:'健康',t:'睡眠<7小时与认知障碍',s:'六项前瞻性队列研究（超130万人）发现，睡眠<7小时与认知障碍风险增加34%相关。',d:'Meta分析显示，无论是自我报告的短睡眠还是客观测量的短睡眠，都与阿尔茨海默病、轻度认知障碍等风险升高显著相关。中年人长期睡眠不足的影响尤其明显。',src:'Meta-analysis'},
  {c:'健康',t:'维生素D3优于D2',s:'维生素D2补充剂可能降低体内D3水平；D3更能增强免疫系统第一道防线。',d:'维生素D3（胆钙化醇）与人体自然合成的形式一致，生物利用度更高。研究表明D2可能干扰D3代谢，因此补充维生素D通常优先选择D3。',src:'2025年研究'},
  {c:'科技',t:'摩尔定律',s:'集成电路上可容纳的晶体管数量约每两年翻一倍。',d:'摩尔定律由Intel联合创始人戈登·摩尔提出，过去几十年驱动了电子产品性能快速提升和成本下降。但近年来由于物理极限，晶体管微缩速度放缓，行业转向Chiplet、3D堆叠等新路径。',src:'Intel/Gordon Moore'},
  {c:'经济',t:'CPI与购买力',s:'CPI持续上涨意味着同样的钱能买到的东西变少。',d:'CPI（居民消费价格指数）衡量一篮子消费品和服务的价格变化。当CPI涨幅高于工资涨幅时，实际购买力下降，生活成本上升。',src:'统计局'},
  {c:'教育',t:'费曼学习法',s:'把学到的内容用简单语言讲给别人听，讲不通的地方就是没真懂。',d:'费曼技巧的核心是“以教验学”。通过输出倒逼输入，把复杂概念简化到连外行都能听懂，从而暴露知识盲点，加深理解。',src:'Richard Feynman'},
  {c:'教育',t:'间隔重复',s:'记忆在快要遗忘时复习效果最好。',d:'艾宾浩斯遗忘曲线显示，遗忘先快后慢。间隔重复（Spaced Repetition）在遗忘临界点复习，可以用最少时间获得最长记忆保持，是语言学习、考试备考的高效方法。',src:'记忆研究'},
  {c:'职场',t:'二八法则',s:'80%的成果往往来自20%的关键努力。',d:'帕累托法则提醒我们优先识别高价值任务。把精力集中在能带来主要产出的20%上，而不是平均用力。',src:'Pareto principle'},
  {c:'自然',t:'光合作用',s:'植物用阳光、二氧化碳和水制造有机物，是地球生命能量的基础。',d:'光合作用主要发生在叶绿体中，把光能转化为化学能，产生葡萄糖和氧气。它不仅是食物链的起点，也调节着大气中的二氧化碳和氧气平衡。',src:'生物学'},
  {c:'历史',t:'罗马混凝土比现代更耐久',s:'两千年前的罗马海港混凝土至今不裂，因为火山灰遇海水生成稀缺矿物。',d:'2017年《American Mineralogist》研究指出，罗马混凝土用的波佐利火山灰与海水反应，会缓慢生成铝托勃莫来石，让结构越泡越结实；反观现代波特兰水泥易腐蚀钢筋。启示：有些“慢”的材料比“快”的更长寿——打牢基础少返工。',src:'American Mineralogist, 2017'},
  {c:'物理',t:'熵增：孤立系统只会越来越乱',s:'不打理的房间必然变乱，热量从高温流向低温，时间因此有方向。',d:'热力学第二定律说孤立系统的熵（无序度）只增不减：房间不会自己变整洁，冰咖啡会凉不会自热。但这不意味着人生注定混乱——你持续投入的能量（整理、学习、锻炼）就是对抗熵增的“负熵流”。',src:'热力学第二定律'},
  {c:'神经科学',t:'大脑具有神经可塑性',s:'大脑不是固定硬件，终其一生都能长新连接。',d:'Maguire 等（2000，《Nature》）发现伦敦出租车司机记忆“知识”时海马体体积更大，证实成人仍有神经发生。这意味着“笨”常是练习不够：每天背单词、练听力，相关神经回路会真的变粗。',src:'Maguire et al., 2000 / Nature'},
  {c:'生物',t:'线粒体夏娃',s:'全人类的母系祖先可追溯到约15万年前的非洲一位女性。',d:'通过母系遗传的线粒体DNA追溯，所有现存人类的线粒体都来自一位共同女性祖先（lineages 唯一幸存者）。这证明人类同源，种族间基因组差异小于0.1%。',src:'线粒体DNA研究'},
  {c:'经济',t:'沉没成本误区',s:'已经花掉、收不回的钱，不应影响未来决策。',d:'行为经济学发现，人们常因“都看了半小时烂片”而硬着头皮看完。理性做法是问：如果现在重来、没花过这钱，我还会继续吗？不会就止损。适用于烂尾剧、亏损股票、无效社交。',src:'行为经济学'},
  {c:'社会学',t:'破窗效应',s:'一扇破窗不修，很快所有窗都会被打破。',d:'Wilson & Kelling（1982）提出：环境中的小失序（涂鸦、垃圾）会暗示“没人管”，诱使更大犯罪。应用到个人：桌面乱、熬夜一次不补救，会滑向全面摆烂。及时“修好第一扇窗”是低成本自律。',src:'Wilson & Kelling, 1982'},
  {c:'哲学',t:'电车难题',s:'撞死1人还是让5人死？没有完美答案的思想实验。',d:'菲利帕·福特1967年提出，用来拷问“功利主义（多数优先）”与“规则伦理（不可主动杀人）”的冲突。现实中医生分配稀缺器官、自动驾驶撞谁，都是它的变体，训练我们在两难中看清价值排序。',src:'Philippa Foot, 1967'},
  {c:'法律',t:'无罪推定',s:'未经审判证明有罪前，人人视为无罪。',d:'《公民权利公约》确立：证明责任在控方，疑点利益归被告。它不是“包庇坏人”，而是用制度避免冤案——宁可放过一个，不可错杀无辜。理解它能帮你在热点案件中不轻易“舆论审判”。',src:'《公民权利和政治权利国际公约》'},
  {c:'地理',t:'厄尔尼诺',s:'赤道太平洋海水异常变暖，能改变全球天气。',d:'每隔2-7年发生，秘鲁渔场减产、东南亚干旱、美洲暴雨。2023-24强厄尔尼诺推高全球气温与粮食价格。它说明地球系统连动：太平洋打个喷嚏，你的外卖都可能涨价。',src:'NOAA'},
  {c:'心理',t:'旁观者效应',s:'人越多，个体出手帮忙的概率反而越低。',d:'Latané & Darley（1968）实验发现：紧急事件中旁观者越多，每人责任感越被稀释（责任分散）。所以遇险要指名求救：“穿蓝衣的先生，请帮我报警”，比泛喊“救命”更有效。',src:'Latané & Darley, 1968'},
  {c:'科技',t:'区块链不可篡改',s:'数据一旦上链，要改需控制过半算力，成本极高。',d:'比特币用工作量证明让篡改历史交易需重算之后所有区块，几乎不可能。但它不保证“上链内容本身真实”，只是“上链后难改”。所以溯源、投票有价值，源头造假链上也无能为力。',src:'比特币白皮书'},
  {c:'健康',t:'肌肉是长寿器官',s:'30岁后每年流失约1%肌肉，肌少症显著增加跌倒与死亡风险。',d:'《Nature Aging》2024综述指出，肌肉量是与死亡风险负相关最强的指标之一。抗阻训练（举哑铃、深蹲）不仅塑形，更维持代谢与血糖，比单纯有氧更“抗衰老”。',src:'Nature Aging, 2024'}
];
function dailyKnowledge(){
  const d=new Date(); const seed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
  const arr=[]; for(let i=0;i<8;i++){ arr.push(KNOWLEDGE[(seed+i*7)%KNOWLEDGE.length]); }
  return arr;
}
async function loadMarket(){
  const grid=$('#marketGrid');
  grid.innerHTML='<div class="mkt-card"><div class="mk-name">加载中...</div></div>';
  window._market={};
  let goldUsd='—',goldCny='—';
  try{ const r=await fetch('https://api.gold-api.com/price/XAU');
    if(r.ok){ const j=await r.json(); goldUsd='$'+(j.price||0).toFixed(2); goldCny='¥'+(j.price*7.2).toFixed(0); window._market.goldCny=j.price*7.2; } }catch(e){}
  let indices=[];
  try{
    const r=await fetch('https://qt.gtimg.cn/q=sh000001,sz399006,sh000688,sh000300');
    if(r.ok){
      const buf=await r.arrayBuffer();
      const text=new TextDecoder('gb18030').decode(buf);
      const re=/v_(\w+)="([^"]+)"/g; let m;
      while((m=re.exec(text))){
        const f=m[2].split('~');
        indices.push({name:f[1],val:f[3],chg:f[31],pct:f[32]});
      }
    }
  }catch(e){ console.log('market fetch error',e); }
  const cards=[{name:'国际金价',val:goldUsd,chg:''},{name:'国内金价(估)',val:goldCny,chg:''}];
  indices.forEach(x=>cards.push({name:x.name,val:x.val,chg:x.pct+'%'}));
  if(!indices.length) cards.push({name:'A股指数',val:'需联网',chg:'(网络受限)'});
  grid.innerHTML=cards.map(c=>`<div class="mkt-card"><div class="mk-name">${esc(c.name)}</div><div class="mk-val">${esc(c.val)}</div>${c.chg?`<div class="mk-chg ${parseFloat(c.chg)>0?'up':'down'}">${c.chg}</div>`:''}</div>`).join('');
}
function renderAffairs(){
  const box=$('#affairsFeed'); if(!box)return;
  const d=new Date(); const seed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
  const pool=CURRENT_AFFAIRS; const n=Math.min(6,pool.length); const start=seed%pool.length;
  let items=[]; for(let i=0;i<n;i++) items.push(pool[(start+i)%pool.length]);
  const dateLabel=d.toLocaleDateString('zh-CN',{month:'long',day:'numeric'});
  box.innerHTML=`<div class="news-date">📅 ${dateLabel} 时事政治 · 每日自动轮换 ${n} 条（点击展开政策解读与博主视角）</div>`+
    items.map((k,i)=>`<details class="affair-item" ${i===0?'open':''}>
    <summary><span class="news-cat">时事</span><b>${esc(k.t)}</b></summary>
    <div class="affair-body"><p>${esc(k.s)}</p><p><b>📌 政策解读：</b>${esc(k.d)}</p><p><b>💬 博主/民间视角：</b>${esc(k.view)}</p><span class="news-src">来源：${esc(k.src)}</span></div>
  </details>`).join('');
}
function renderKnowledge(){
  const feed=$('#newsFeed'); if(!feed)return;
  const list=dailyKnowledge();
  feed.innerHTML=`<div class="news-date">📅 ${new Date().toLocaleDateString('zh-CN')} 精选知识 · 共${list.length}条（点击展开详情）</div>`+
    list.map(k=>`<details class="news-item">
      <summary><span class="news-cat">${esc(k.c)}</span><b>${esc(k.t)}：</b>${esc(k.s)}</summary>
      <div class="news-detail"><p>${esc(k.d)}</p><span class="news-src">来源：${esc(k.src)}</span></div>
    </details>`).join('');
}

/* ===== 8. 阅读观影 ===== */
const READING_REC=[
  {t:'《被讨厌的勇气》',ty:'书',d:'阿德勒心理学，课题分离，适合内耗的人',plat:'微信读书'},
  {t:'《你想活出怎样的人生》',ty:'书',d:'宫崎骏原著，温柔有力',plat:'微信读书'},
  {t:'《置身事内》',ty:'书',d:'读懂中国政府与经济发展',plat:'微信读书'},
  {t:'《人类简史》',ty:'书',d:'从认知革命到智人统治地球，宏大又好读',plat:'微信读书'},
  {t:'《非暴力沟通》',ty:'书',d:'把“你总是”换成“我感到”，关系立刻顺',plat:'微信读书'},
  {t:'《蛤蟆先生去看心理医生》',ty:'书',d:'用童话讲抑郁与自我救赎，轻松入心',plat:'微信读书'},
  {t:'电影《盗梦空间》',ty:'电影',d:'烧脑科幻，二刷不亏',plat:'腾讯视频'},
  {t:'电影《星际穿越》',ty:'电影',d:'硬核物理+父女情，泪点与脑洞齐飞',plat:'腾讯视频'},
  {t:'电影《千与千寻》',ty:'电影',d:'成长寓言，每个年龄看都有新味',plat:'B站'},
  {t:'纪录片《人生一串》',ty:'纪录片',d:'深夜慎看，烟火气十足',plat:'B站'},
  {t:'纪录片《人生七年》',ty:'纪录片',d:'跟踪数人一生，看清阶层与选择',plat:'B站'},
  {t:'剧《漫长的季节》',ty:'剧',d:'年度好剧，悬疑与生活交织',plat:'腾讯视频'}
];
function renderReading(){ const wkNum=Math.ceil(dayIndex(todayStr())/7)%4+1;
  const book=READING_REC[(wkNum*2)%READING_REC.length];
  const film=READING_REC[(wkNum*2+1)%READING_REC.length];
  $('#readingTask').innerHTML=`📌 本周阅读任务（第${wkNum}周，可断不可弃）：<br>📖 读书：《${esc(book.t)}》至少30分钟<br>🎬 观影：看 1 部推荐影视（如《${esc(film.t)}》）<br>✍️ 读完/看完在下方记录评分与感悟`;
  $('#readingRec').innerHTML=READING_REC.map(r=>`<div class="rd-card"><div class="rd-t"><span class="rd-ty">${esc(r.ty)}</span>${esc(r.t)}</div><div class="rd-d">${esc(r.d)}</div><a href="https://weread.qq.com/" target="_blank">在${esc(r.plat)}打开 ↗</a></div>`).join('');
  $('#readingList').innerHTML=DB.reading.length?DB.reading.slice().reverse().map(x=>`<div class="rec-item"><span>${'★'.repeat(x.score)||'☆'} ${esc(x.title)}（${x.type}）· ${esc(x.note)}</span></div>`).join(''):'<div class="hint">还没有记录，这周挑一本开始吧</div>';
}
function saveReading(){ const type=$('#rdType').value; const title=$('#rdTitle').value.trim(); const score=parseInt($('#rdScore').value)||0; const note=$('#rdNote').value.trim(); if(!title){toast('请填标题');return;} DB.reading.push({type,title,score,note,date:todayStr()}); $('#rdTitle').value=''; $('#rdNote').value=''; saveDB(); renderReading(); toast('已记录'); }

/* ===== 9. 小猫档案 ===== */
const CATS=[
  {name:'妞妞',sex:'母',status:'已逝',tag:'🕯️',avatarImg:'icons/cats/niuniu.png',info:'美短虎斑，已绝育。2026-07-03 安乐，约8-9岁。愿在喵星安好。'},
  {name:'跳跳',sex:'母',status:'在册',tag:'😺',birth:'2023-04-13',avatarImg:'icons/cats/tiaotiao.png',info:'已绝育。狸花猫，2023-05-13 捡回（约1月龄）。现9.2斤。'},
  {name:'可可',sex:'公',status:'在册',tag:'😼',birth:'2022-08-14',avatarImg:'icons/cats/keke.png',info:'已绝育。重点色布偶，蓝眼睛。8.8斤。'},
  {name:'金喜',sex:'母',status:'在册',tag:'😺',birth:'2025-08-15',avatarImg:'icons/cats/jinxi.png',info:'已绝育。山猫纹布偶，蓝眼睛。10斤。'}
];
function catAge(birthStr){
  if(!birthStr)return'';
  const birth=new Date(birthStr); const now=new Date();
  let years=now.getFullYear()-birth.getFullYear();
  let months=now.getMonth()-birth.getMonth();
  if(months<0){years--; months+=12;}
  if(years<0)return'';
  if(years===0)return `${months}个月`;
  return `${years}岁${months}个月`;
}
function catAvatar(c){
  if(c.avatarImg) return `<img src="${esc(c.avatarImg)}" class="cat-ava-img" alt="${esc(c.name)}">`;
  const type=c.avatar;
  if(type==='tabby') return `<svg viewBox="0 0 100 100" class="cat-ava"><circle cx="50" cy="55" r="35" fill="#d4894e"/><path d="M28 28 L38 50 L22 45 Z" fill="#b56d36"/><path d="M72 28 L62 50 L78 45 Z" fill="#b56d36"/><path d="M30 55 Q50 75 70 55" stroke="#8b4e22" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="40" cy="48" r="4" fill="#3a2a1a"/><circle cx="60" cy="48" r="4" fill="#3a2a1a"/><ellipse cx="50" cy="58" rx="5" ry="3" fill="#f4c2a1"/><path d="M25 60 Q35 65 30 75 M75 60 Q65 65 70 75" stroke="#8b4e22" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  if(type==='seal-point') return `<svg viewBox="0 0 100 100" class="cat-ava"><circle cx="50" cy="55" r="35" fill="#f5e6d3"/><path d="M28 28 L38 50 L22 45 Z" fill="#4a3b32"/><path d="M72 28 L62 50 L78 45 Z" fill="#4a3b32"/><ellipse cx="35" cy="50" rx="14" ry="16" fill="#4a3b32"/><ellipse cx="65" cy="50" rx="14" ry="16" fill="#4a3b32"/><circle cx="42" cy="52" r="3" fill="#6ecbf5"/><circle cx="58" cy="52" r="3" fill="#6ecbf5"/><ellipse cx="50" cy="62" rx="4" ry="2.5" fill="#d4a593"/><path d="M35 78 Q50 85 65 78" stroke="#4a3b32" stroke-width="2" fill="none"/></svg>`;
  if(type==='lynx-point') return `<svg viewBox="0 0 100 100" class="cat-ava"><circle cx="50" cy="55" r="35" fill="#f7ede0"/><path d="M28 28 L38 50 L22 45 Z" fill="#7d6555"/><path d="M72 28 L62 50 L78 45 Z" fill="#7d6555"/><ellipse cx="35" cy="50" rx="14" ry="16" fill="#a88b74"/><ellipse cx="65" cy="50" rx="14" ry="16" fill="#a88b74"/><path d="M35 42 L45 50 L35 48 M65 42 L55 50 L65 48 M45 38 L50 46 L55 38" stroke="#5a4536" stroke-width="1.5" fill="none"/><circle cx="42" cy="52" r="3" fill="#6ecbf5"/><circle cx="58" cy="52" r="3" fill="#6ecbf5"/><ellipse cx="50" cy="62" rx="4" ry="2.5" fill="#d4a593"/></svg>`;
  return `<svg viewBox="0 0 100 100" class="cat-ava"><circle cx="50" cy="55" r="35" fill="#ddd"/><path d="M30 30 L40 50 L25 45 Z" fill="#bbb"/><path d="M70 30 L60 50 L75 45 Z" fill="#bbb"/><circle cx="40" cy="50" r="4" fill="#333"/><circle cx="60" cy="50" r="4" fill="#333"/><ellipse cx="50" cy="60" rx="5" ry="3" fill="#f4c2a1"/></svg>`;
}
const CAT_KNOWLEDGE=[
  {t:'湿粮补水',d:'康奈尔猫健康中心2024年引用的研究显示，吃湿粮的猫每日水分摄入和尿量几乎是只吃干粮猫的两倍以上，有助于泌尿和肾脏健康。',src:'Cornell Feline Health Center'},
  {t:'干粮与肥胖',d:'干粮为主（≥75%）的猫超重几率约是主食湿粮猫的2.4倍；幼年时干粮占比超50%，超重/肥胖风险可达79%。',src:'J Feline Med Surg, 2024 (PMC11577473)'},
  {t:'猫肥胖率',d:'美国约40%的家猫超重或肥胖，部分国家高达63%，是伴侣动物最常见的营养相关问题。',src:'J Feline Med Surg, 2024'},
  {t:'绝育后控重',d:'自由采食的猫绝育后1个月体重可增加17%，3个月可增加43%；建议绝育后改为定量喂食。',src:'PMC11577473'},
  {t:'肥胖与糖尿病',d:'肥胖猫患2型糖尿病的风险是理想体重猫的2–4倍，每增重1公斤胰岛素敏感性下降约30%。',src:'PMC11577473'},
  {t:'喂食方式',d:'AAHA/AAFP 2021指南建议健康成猫采用定量喂食、每天两餐，零食热量不超过每日10%。',src:'AAHA/AAFP 2021'},
  {t:'读懂标签',d:'猫粮标签上的“AAFCO complete and balanced”是营养达标的关键；第一原料最好是鸡肉、鱼等具体肉类。',src:'AAFCO'},
  {t:'换粮过渡',d:'换粮应逐步进行7–10天，避免软便或呕吐。',src:'兽医临床实践'},
  {t:'室内猫寿命',d:'在良好照护下，室内猫通常能活到15–18岁甚至更长；定期体检（老年猫每半年一次）有助于早发现肾病、甲减等。',src:'J Feline Med Surg, 2024'},
  {t:'环境丰容',d:'缺乏环境刺激的猫容易因压力而过度进食；提供猫爬架、躲藏处、每日互动玩耍有助于控制体重和行为问题。',src:'J Feline Med Surg, 2024'}
];
function renderCats(){ $('#catGrid').innerHTML=CATS.map(c=>{
    const age=c.status==='已逝'?'约8-9岁':(c.birth?catAge(c.birth):'');
    return `<div class="cat-card"><div class="cat-ava-wrap">${catAvatar(c)}</div><div class="cat-body"><div class="cat-name">${c.tag} ${esc(c.name)}<span class="cat-tag">${c.sex}${c.status==='已逝'?' · 已逝':age?' · '+age:''}</span></div><div class="cat-info">${esc(c.info)}</div></div></div>`;
  }).join('');
  $('#catEventName').innerHTML=CATS.map(c=>`<option>${c.name}</option>`).join('');
  $('#catKnowledge').innerHTML=CAT_KNOWLEDGE.map(k=>`<div class="ck-item"><b>${esc(k.t)}：</b>${esc(k.d)} <span class="news-src">来源：${esc(k.src)}</span></div>`).join('');
  $('#catEventList').innerHTML=DB.cats.events.length?DB.cats.events.slice().reverse().map(e=>`<div class="rec-item"><span>${esc(e.cat)} · ${e.date} · ${esc(e.desc)}</span><button class="rdel" onclick="delCatEvent('${e.date}','${esc(e.desc)}')">×</button></div>`).join(''):'<div class="hint">暂无健康事件</div>';
}
function saveCatEvent(){ const cat=$('#catEventName').value; const date=$('#catEventDate').value||todayStr(); const desc=$('#catEventDesc').value.trim(); if(!desc){toast('请填事件');return;} DB.cats.events.push({cat,date,desc}); $('#catEventDesc').value=''; saveDB(); renderCats(); toast('已记录'); }
function delCatEvent(d,desc){ DB.cats.events=DB.cats.events.filter(e=>!(e.date===d&&e.desc===desc)); saveDB(); renderCats(); }

/* ===== 穿搭 ===== */
const OUTFIT_BLOGGERS=[
  {n:'小丁的穿搭日记',kw:'小丁的穿搭日记 梨型',d:'专注小个子梨型身材，实穿显高'},
  {n:'阿lin拯救花',kw:'阿lin拯救花 梨型身材',d:'梨形穿搭+平价单品'},
  {n:'一花啦啦啦',kw:'一花啦啦啦 小个子',d:'日系休闲，适合老师通勤'},
  {n:'宋京墨',kw:'宋京墨 穿搭',d:'简约气质通勤风'},
  {n:'胖梨阿姨',kw:'胖梨阿姨 穿搭',d:'微胖梨型友好'}
];
function weatherDesc(code){
  const map={0:'☀️ 晴',1:'🌤️ 多云',2:'⛅ 阴',3:'☁️ 阴天',45:'🌫️ 雾',48:'🌫️ 雾凇',
    51:'🌦️ 毛毛雨',53:'🌦️ 小雨',55:'🌧️ 中雨',61:'🌧️ 小雨',63:'🌧️ 中雨',65:'🌧️ 大雨',
    71:'🌨️ 小雪',73:'🌨️ 中雪',75:'🌨️ 大雪',95:'⛈️ 雷雨',96:'⛈️ 雷暴伴冰雹'};
  return map[code]||'🌥️ 多云';
}
function outfitByWeather(temp,code){
  const rainy=[51,53,55,61,63,65,80,81,82,95,96,99];
  const base={top:'',bottom:'',outer:'',shoes:'',acc:'',tips:''};
  if(temp>=28){
    base.top='V领短袖/方领泡泡袖衬衫（浅色）';
    base.bottom='高腰A字半身裙/阔腿中裤（深色）';
    base.shoes='透气乐福鞋/小白鞋';
    base.acc='草编包+防晒帽';
    base.tips='梨型重点：上衣露锁骨、下装遮胯宽，深色下装更显瘦。';
  }else if(temp>=22){
    base.top='薄针织短袖/衬衫';
    base.bottom='高腰直筒牛仔裤/九分阔腿裤';
    base.outer='针织开衫（早晚披）';
    base.shoes='小白鞋/低跟穆勒鞋';
    base.acc='简约金属项链';
    base.tips='开衫长度遮到胯部最宽处，最显瘦。';
  }else if(temp>=15){
    base.top='长袖打底衫/卫衣';
    base.bottom='高腰西装裤/灯芯绒直筒裤';
    base.outer='风衣/薄呢外套';
    base.shoes='短靴/运动鞋';
    base.acc='中号托特包';
    base.tips='风衣选长度到膝盖上下，露出脚踝最显高。';
  }else{
    base.top='高领毛衣/加绒打底';
    base.bottom='加绒直筒裤/毛呢A字长裙';
    base.outer='羽绒服/厚大衣';
    base.shoes='加绒短靴';
    base.acc='围巾+手套';
    base.tips='厚外套选收腰款或H型，避免膨胀感。';
  }
  if(rainy.includes(code)){ base.shoes+=' · 雨鞋/防水鞋套'; base.acc+=' · 折叠伞'; base.tips='雨天裤脚易湿，建议穿长裙或九分裤+短靴。'; }
  return base;
}
function outfitVisualImg(temp){
  let f='warm';
  if(temp>=28) f='summer';
  else if(temp>=20) f='warm';
  else if(temp>=10) f='cool';
  else f='cold';
  const label={summer:'炎热 · 清凉透气',warm:'舒适 · 轻薄叠穿',cool:'微凉 · 针织+外套',cold:'寒冷 · 厚外套保暖'}[f];
  return `<img src="icons/outfits/${f}.png" alt="${label}" class="outfit-img"><div style="position:absolute;bottom:8px;left:8px;background:rgba(0,0,0,.55);color:#fff;font-size:11px;padding:3px 8px;border-radius:8px">${label}</div>`;
}
const CITIES=[
  {name:'福泉',lat:26.70,lon:107.51},
  {name:'遵义',lat:27.73,lon:106.93},
  {name:'贵阳',lat:26.65,lon:106.63}
];
async function loadOutfit(){
  const city=CITIES.find(c=>c.name===DB.city)||CITIES[2]; // 默认贵阳
  if($('#citySel'))$('#citySel').value=DB.city;
  let temp=26, code=1;
  try{
    const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,weather_code&timezone=Asia/Shanghai`);
    if(r.ok){ const j=await r.json(); temp=j.current.temperature_2m; code=j.current.weather_code; }
  }catch(e){}
  const desc=weatherDesc(code);
  const o=outfitByWeather(temp,code);
  $('#weatherToday').innerHTML=`<div class="weather-main">${desc} · ${city.name} · ${temp}℃</div><div class="weather-sub">根据天气和梨型身材自动生成今日穿搭</div>`;
  $('#outfitRec').innerHTML=`<div class="outfit-items">
    <div><b>👚 上装：</b>${o.top}</div>
    <div><b>👖 下装：</b>${o.bottom}</div>
    ${o.outer?`<div><b>🧥 外套：</b>${o.outer}</div>`:''}
    <div><b>👟 鞋子：</b>${o.shoes}</div>
    <div><b>👜 配饰：</b>${o.acc}</div>
    <div class="outfit-tip">💡 ${o.tips}</div>
  </div>`;
  $('#outfitVisual').innerHTML=outfitVisualImg(temp);
  $('#outfitBloggers').innerHTML=OUTFIT_BLOGGERS.map(b=>`<a href="https://search.bilibili.com/all?keyword=${encodeURIComponent(b.kw)}" target="_blank" class="ob-card"><div class="ob-name">${esc(b.n)}</div><div class="ob-d">${esc(b.d)}</div></a>`).join('');
}
function saveCity(){ const v=$('#citySel').value; DB.city=v; saveDB(); loadOutfit(); }

/* ===== 10. 美妆学习（旋转推荐池：看过/完成打卡 + 遗忘重推 + B站/抖音双链） ===== */
const BEAUTY=[
  {t:'姜乘澜 · 骨相化妆/风格定位',note:'根据脸型骨骼讲化妆思路，干货',search:'姜乘澜',dy:'姜乘澜'},
  {t:'金大迪 · 通勤淡妆/底妆',note:'自然伪素颜，适合上班',search:'金大迪',dy:'金大迪'},
  {t:'一枝楠楠 · 妆教细节',note:'眼妆唇妆细化教程',search:'一枝楠楠 化妆',dy:'一枝楠楠'},
  {t:'米米克 · 氛围感妆容',note:'甜美氛围感',search:'米米克',dy:'米米克'},
  {t:'圆脸化妆博主合集',note:'针对圆脸的修饰思路',search:'圆脸 化妆 教程',dy:'圆脸妆教'},
  {t:'程十安 · 新手底妆',note:'底妆鼻祖级，零基础友好',search:'程十安',dy:'程十安'},
  {t:'唐毅 · 专业化妆师手法',note:'明星化妆师，手法专业',search:'唐毅 化妆',dy:'唐毅'},
  {t:'仇仇 · 通勤快速妆',note:'10分钟出门妆',search:'仇仇 化妆',dy:'仇仇化妆'},
  {t:'小猪姐姐 · 气质妆',note:'温柔气质风',search:'小猪姐姐 妆',dy:'小猪姐姐妆'},
  {t:'程十安 · 氛围感伪素颜',note:'日常通勤神妆',search:'程十安 伪素颜',dy:'程十安伪素颜'},
  {t:'唐毅 · 骨相修容',note:'修容不显脏',search:'唐毅 修容',dy:'唐毅修容'},
  {t:'易烫Etang · 眼妆教程',note:'新手眼妆进阶',search:'易烫 眼妆',dy:'易烫眼妆'}
];
function renderBeauty(){
  const box=$('#beautyList'); if(!box)return;
  const {list}=pickRecs(BEAUTY,'beauty',6);
  if(!list.length){ box.innerHTML='<div class="rec-sub">🎉 美妆博主都刷过啦！等每周二补充新面孔。</div>'; return; }
  box.innerHTML=`<div class="rec-sub">🔥 优先推没看过的美妆博主 · 看过超${FORGET_DAYS}天复习重推 · 点「不想看」永不再推</div>`+list.map(r=>{
    const it=r.it; const id=recId('beauty',it);
    const bili='https://search.bilibili.com/all?keyword='+encodeURIComponent(it.search);
    const dy='https://www.douyin.com/search/'+encodeURIComponent(it.dy||it.search);
    const rev=r.review?'<span class="rec-rev">🔁复习</span>':'';
    return `<div class="rec-card ${r.review?'is-review':''}"><div class="rec-ct"><span class="rec-type">美妆</span>${rev}</div><div class="rec-rt">${esc(it.t)}</div><div class="rec-rn">${esc(it.note)}</div><div class="rec-links"><a href="${bili}" target="_blank" class="rec-link">▶ B站</a><a href="${dy}" target="_blank" class="rec-link dy">▶ 抖音</a></div>${recBtns('beauty',id,r.review)}</div>`;
  }).join('');
}

/* ===== 11. 抖音话题 ===== */
const TRENDING=[
  {plat:'抖音',t:'“City不City”',d:'外国博主在中国旅游时魔性的“City不City啊”问句，意思是“这地方洋气不洋气/刺激不刺激”。现在被广泛用来调侃或夸赞任何事物，比如“这顿饭City不City”。'},
  {plat:'小红书',t:'“班味”',d:'形容上班族被工作“腌入味”的疲惫气质——眼神呆滞、穿搭潦草、说话没劲。源自“如何洗掉班味”的讨论，是打工人自嘲的高频词。'},
  {plat:'B站',t:'“电子木鱼 / 赛博功德”',d:'年轻人用手机App敲木鱼“积功德”解压，边刷剧边敲。它反映了高压下的戏谑式自我调节，也暗含对“求平安顺遂”的轻松寄托。'},
  {plat:'抖音',t:'“听泉鉴宝”式鉴宝',d:'博主连麦帮助网友鉴宝的娱乐直播火出圈，带火“开门（真货）/ 概率系（存疑）”等行话。看个乐就行，别当真鉴定。'},
  {plat:'微博',t:'“已读乱回”',d:'形容聊天时看到消息却故意回毫无关系的内容，或装没看见。是年轻人对社交压力、不想秒回的一种幽默反抗。'},
  {plat:'抖音',t:'“不是…买不起，而是…更有性价比”',d:'一种自嘲式种草句式：不是买不起贵的，而是退而求其次的平替更香。本质是消费降级下的心理按摩。'},
  {plat:'B站',t:'“抽象”',d:'形容难以描述的离谱、无厘头、违背常理的行为或内容。是Z世代评价“看不懂但好笑”的高频词，偏褒义玩梗。'},
  {plat:'小红书',t:'“公主请上车”',d:'源自综艺里的礼貌玩梗，后被广泛用于各种场景的“仪式感邀请”，比如“公主请点外卖”“公主请喝水”。'},
  {plat:'抖音',t:'“硬控我30秒”',d:'“硬控”原是游戏术语（强行控制住），现在指内容太吸引人，让人走不开、被“控制”住。常配“硬控我X秒”玩梗。'},
  {plat:'全网',t:'“发疯文学 / 麦学”',d:'用夸张、排版混乱的文学化方式表达崩溃情绪（如“我碎了”），是一种情绪出口和社交共鸣，别太当真。'}
];
function renderTrending(){
  const box=$('#trendingFeed'); if(!box)return;
  const d=new Date(); const seed=d.getFullYear()*10000+(d.getMonth()+1)*100+d.getDate();
  const pool=TRENDING; const n=Math.min(5,pool.length); const start=seed%pool.length;
  let items=[]; for(let i=0;i<n;i++) items.push(pool[(start+i)%pool.length]);
  const dateLabel=d.toLocaleDateString('zh-CN',{month:'long',day:'numeric'});
  box.innerHTML=`<div class="news-date">📅 ${dateLabel} 各平台热门梗 · 每日轮换（不知道的梗我帮你解释）</div>`+
    items.map(k=>`<div class="trend-item"><div class="trend-top"><span class="trend-plat">${esc(k.plat)}</span><b>${esc(k.t)}</b></div><div class="trend-d">${esc(k.d)}</div></div>`).join('');
}
const DOUYIN=[
  '【个人成长】"30岁才开始自律晚吗？" 反差开头+干货清单',
  '【减脂日常】"高中老师的一日三餐" vlog+减脂餐',
  '【养猫】"4只猫的修罗场" 搞笑日常合集',
  '【语言学习】"零基础学韩语Day1" 打卡系列',
  '【好物】"打工人桌面好物" 平价分享',
  '【情感】"如何停止精神内耗" 共鸣向'
];
function renderDouyin(){ const arr=DB.douyin.length?DB.douyin:DOUYIN; $('#douyinTopics').innerHTML=arr.map((t,i)=>`<div class="dy-item"><span>${esc(t)}</span><button class="dy-del" onclick="delDouyin(${i})">×</button></div>`).join(''); }
function addDouyin(){ const v=$('#dyInput').value.trim(); if(!v)return; if(!DB.douyin.length)DB.douyin=[]; DB.douyin.push(v); $('#dyInput').value=''; saveDB(); renderDouyin(); }
function delDouyin(i){ DB.douyin.splice(i,1); saveDB(); renderDouyin(); }

/* ===== 每周数据 ===== */
function isoWeek(d){
  const date=new Date(d); const day=(date.getDay()+6)%7; date.setDate(date.getDate()-day);
  const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,'0'); const day2=String(date.getDate()).padStart(2,'0');
  return `${y}-W${String(Math.ceil((date-new Date(y,0,1))/86400000/7)+1).padStart(2,'0')}`;
}
function parseWeek(ws){
  const [y,w]=ws.split('-W'); const d=new Date(y,0,1); d.setDate(d.getDate()+(w-1)*7 - (d.getDay()+6)%7);
  const start=new Date(d); const end=new Date(d); end.setDate(end.getDate()+6);
  return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
function setWeek(dateStr){ $('#weekSelect').value=isoWeek(dateStr); renderWeekly(); }
let wkWeightChart,wkLangChart,wkFinChart;
function renderWeekly(){
  const ws=$('#weekSelect').value||isoWeek(todayStr()); const {start,end}=parseWeek(ws);
  const days=[]; for(let d=new Date(start);d<=new Date(end);d.setDate(d.getDate()+1)) days.push(d.toISOString().slice(0,10));
  // 概览
  const suppDays=days.filter(d=>(DB.supplements[d]||[]).length>0).length;
  const todoTotal=DB.todos.filter(t=>days.includes(t.date)).length;
  const todoDone=DB.todos.filter(t=>days.includes(t.date)&&t.done).length;
  const langMin=DB.language.filter(r=>days.includes(r.date)).reduce((s,r)=>s+r.min,0);
  const langDays=DB.language.filter(r=>days.includes(r.date)&&r.min>0).length;
  const finExp=DB.finance.filter(r=>days.includes(r.date)&&r.type==='支出').reduce((s,r)=>s+r.amt,0);
  const finInc=DB.finance.filter(r=>days.includes(r.date)&&r.type==='收入').reduce((s,r)=>s+r.amt,0);
  const workoutDays=days.filter(d=>DB.workout.check[d]).length;
  const sleepDays=days.filter(d=>{
    const wk=currentSleepWeekFromDate(d); const key='W'+new Date(d).getFullYear()+'-'+wk;
    const arr=(DB.sleep&&DB.sleep.weekCheck&&DB.sleep.weekCheck[key])||[];
    const dow=new Date(d).getDay(); const i=(dow===0?6:dow-1); return arr[i];
  }).length;
  $('#weeklySummary').innerHTML=`<div class="ws-grid">
    <div class="ws-item"><div class="v">${suppDays}/7</div><div class="l">保健品打卡</div></div>
    <div class="ws-item"><div class="v">${todoDone}${todoTotal?'/'+todoTotal:''}</div><div class="l">待办完成</div></div>
    <div class="ws-item"><div class="v">${langMin}</div><div class="l">学习分钟</div></div>
    <div class="ws-item"><div class="v">${workoutDays}/7</div><div class="l">运动打卡</div></div>
    <div class="ws-item"><div class="v">${sleepDays}/7</div><div class="l">早睡打卡</div></div>
    <div class="ws-item exp"><div class="v">¥${finExp.toFixed(0)}</div><div class="l">本周支出</div></div>
  </div>`;
  // 打卡完成率
  const labels=['一','二','三','四','五','六','日'];
  const checks=days.map(d=>{
    let c=0; if((DB.supplements[d]||[]).length)c++; if(DB.workout.check[d])c++; if(DB.todos.some(t=>t.date===d&&t.done))c++; return c;
  });
  $('#weeklyCheck').innerHTML=`<div class="wcheck-grid">${days.map((d,i)=>`<div class="wcheck-day ${checks[i]>=2?'good':checks[i]>=1?'ok':''}"><div>周${labels[i]}</div><div class="wd-num">${d.slice(5)}</div><div class="wd-bar" style="height:${Math.max(4,checks[i]*12)}px"></div><div>${checks[i]}/3</div></div>`).join('')}</div>`;
  // 体重图
  const wData=DB.dietWeight.filter(r=>r.date>=start&&r.date<=end).sort((a,b)=>a.date.localeCompare(b.date));
  if(wkWeightChart)wkWeightChart.destroy();
  wkWeightChart=new Chart($('#wkWeightChart'),{type:'line',data:{labels:wData.map(x=>x.date.slice(5)),datasets:[{label:'体重kg',data:wData.map(x=>x.kg),borderColor:'var(--orange)',fill:false}]},options:{plugins:{legend:{display:false}}}});
  // 语言图
  const langBy={英语:0,日语:0,韩语:0}; DB.language.filter(r=>days.includes(r.date)).forEach(r=>langBy[r.lang]=(langBy[r.lang]||0)+r.min);
  if(wkLangChart)wkLangChart.destroy();
  wkLangChart=new Chart($('#wkLangChart'),{type:'doughnut',data:{labels:Object.keys(langBy),datasets:[{data:Object.values(langBy),backgroundColor:['#5aa9e6','#ff7eb3','#3bb89a']}]},options:{plugins:{legend:{position:'right'}}}});
  // 消费图
  const catBy={}; DB.finance.filter(r=>days.includes(r.date)&&r.type==='支出').forEach(r=>catBy[r.cat]=(catBy[r.cat]||0)+r.amt);
  if(wkFinChart)wkFinChart.destroy();
  wkFinChart=new Chart($('#wkFinChart'),{type:'doughnut',data:{labels:Object.keys(catBy),datasets:[{data:Object.values(catBy),backgroundColor:['#ff8c42','#3bb89a','#5aa9e6','#ff7eb3','#f6b93b','#9b8579','#e17055']}]},options:{plugins:{legend:{position:'right'}}}});
  // 运动
  $('#wkWorkout').innerHTML=`<div class="wkwo-grid">${days.map((d,i)=>`<div class="wkwo-day ${DB.workout.check[d]?'done':''}"><div>周${labels[i]}</div><div>${d.slice(5)}</div><div class="wkwo-ic">${DB.workout.check[d]?'✓':'○'}</div></div>`).join('')}</div>`;
  // 睡眠
  const sleepRecs=days.map(d=>{const t=DB.sleep&&DB.sleep.records&&DB.sleep.records[d];return t?bedtimeToMin(t):null;});
  const sleepVals=sleepRecs.filter(x=>x!=null);
  const sleepAvg=sleepVals.length?Math.round(sleepVals.reduce((a,b)=>a+b,0)/sleepVals.length):null;
  const sleepMin=sleepVals.length?Math.min.apply(null,sleepVals):null;
  $('#wkSleep').innerHTML=`<div class="ws-grid"><div class="ws-item"><div class="v">${sleepVals.length}/7</div><div class="l">有记录</div></div><div class="ws-item"><div class="v">${sleepAvg?minToBedtime(sleepAvg):'—'}</div><div class="l">平均入睡</div></div><div class="ws-item"><div class="v">${sleepMin!=null?minToBedtime(sleepMin):'—'}</div><div class="l">最早一次</div></div></div>`;
  if(window._wkSleepChart)window._wkSleepChart.destroy();
  const cvs=$('#wkSleepChart');
  if(cvs)window._wkSleepChart=new Chart(cvs,{type:'bar',data:{labels:days.map(d=>d.slice(5)),datasets:[{label:'入睡',data:sleepRecs,backgroundColor:'#ff8c42',borderRadius:5}]},options:{plugins:{legend:{display:false}},scales:{y:{ticks:{callback:v=>v==null?'':minToBedtime(v)},suggestedMin:1320,suggestedMax:1560},x:{ticks:{font:{size:10}}}}}});
  // 建议
  const sug=[];
  if(suppDays<4) sug.push('💊 保健品这周只打了'+suppDays+'天，建议把保健品放在牙刷/水杯旁，睡前顺手续上。');
  if(workoutDays<3) sug.push('🏃 运动'+workoutDays+'天略少，下周保证「爬坡+拉伸」最低组合，哪怕只练15分钟也算数。');
  if(langMin<90) sug.push('📚 语言学习'+langMin+'分钟，下周每天抽15分钟听1期英文/日文素材，通勤时即可完成。');
  if(finExp>DB.budget*0.25) sug.push('💰 本周支出占预算比例较高，下周记账时给「购物/餐饮」设单日限额。');
  if(sleepDays<3) sug.push('🌙 早睡打卡'+sleepDays+'天，下周先把「手机23:00离开卧室」这一条做到，比逼自己立刻睡着更有效。');
  if(!sug.length) sug.push('🎉 这周完成得不错！下周保持当前节奏，重点是把好习惯继续串联。');
  $('#weeklyAdvice').innerHTML=`<ul>${sug.map(s=>`<li>${s}</li>`).join('')}</ul>`;
}
function currentSleepWeekFromDate(dateStr){
  const s=DB.sleep&&DB.sleep.setting; if(!s||!s.startDate) return 1;
  const start=new Date(s.startDate); const now=new Date(dateStr);
  const days=Math.floor((now-start)/86400000); return Math.max(1,Math.floor(days/7)+1);
}

/* ===== 心愿屋 ===== */
const WISH_ITEMS=[
  {id:'milktea',n:'🧋 一杯奶茶',cost:800,diff:'easy',d:'快乐水，小口喝更满足。800分，不会随便兑换。'},
  {id:'snack',n:'🍗 一顿夜宵',cost:1200,diff:'easy',d:'奖励自己一次，但别天天兑换。'},
  {id:'dessert',n:'🍰 一块甜品/蛋糕',cost:1500,diff:'easy',d:'甜品抬高到1500分，想吃到得先认真打卡。'},
  {id:'movie',n:'🎬 看一部电影',cost:600,diff:'mid',d:'院线或在家投影都行。'},
  {id:'bigmeal',n:'🍲 一顿大餐',cost:1000,diff:'mid',d:'约朋友或独自享受，但一月最多一次。'},
  {id:'spa',n:'💆 一次按摩/足疗',cost:1400,diff:'mid',d:'奖励身体放松，比吃夜宵更值得。'},
  {id:'daytrip',n:'🚗 周边一日游',cost:2500,diff:'hard',d:'周末短途，换个心情。'},
  {id:'gadget',n:'📱 一件电子产品/配件',cost:3500,diff:'hard',d:'非冲动消费，攒够了再买。'},
  {id:'concert',n:'🎤 一场演唱会/话剧',cost:5000,diff:'hard',d:'精神大餐，值得长期目标。'},
  {id:'travel',n:'✈️ 一次旅行基金',cost:8000,diff:'legend',d:'诗和远方，用自律换来自由。'},
  {id:'car',n:'🚗 买车基金',cost:50000,diff:'legend',d:'2-3年后的大目标，每1积分都是存款。'}
];
const CUSTOM_WISH_DIFF={'小奖励':{cost:500,diff:'easy'},'中等奖励':{cost:2000,diff:'hard'},'大目标':{cost:10000,diff:'legend'}};
const POINT_RULE=[
  {k:'待办完成',v:5},
  {k:'保健品/种',v:2},
  {k:'早睡打卡',v:15},
  {k:'运动打卡',v:20},
  {k:'语言学习/分钟',v:1},
  {k:'记账/笔',v:5},
  {k:'阅读观影记录',v:25},
  {k:'音乐番茄/首',v:5},
  {k:'体重记录',v:10}
];
function calcPoints(){
  let total=0;
  DB.todos.filter(t=>t.done).forEach(()=>total+=5);
  Object.values(DB.supplements).forEach(arr=>total+=arr.length*2);
  Object.values(DB.workout.check).forEach(v=>{if(v)total+=20;});
  DB.language.forEach(r=>total+=r.min);
  DB.finance.forEach(()=>total+=5);
  DB.reading.forEach(()=>total+=25);
  DB.dietWeight.forEach(()=>total+=10);
  Object.values(DB.musicPomo||{}).forEach(c=>total+=c*5);
  if(DB.sleep&&DB.sleep.weekCheck){
    Object.values(DB.sleep.weekCheck).forEach(arr=>arr.forEach(v=>{if(v)total+=15;}));
  }
  return total;
}
function renderWish(){
  const earned=calcPoints(); const used=(DB.wish&&DB.wish.redeemed||[]).reduce((s,x)=>s+x.cost,0); const bal=earned-used;
  $('#wishBalance').innerHTML=`<div class="wb-num">${bal}</div><div class="wb-sub">累计获得 ${earned} · 已兑换 ${used}</div>`;
  $('#wishRule').innerHTML=`<div class="wr-title">积分规则</div><div class="wr-list">${POINT_RULE.map(r=>`<span>${r.k} +${r.v}</span>`).join('')}</div>`;
  const allItems=[...WISH_ITEMS, ...(DB.customWishes||[])];
  $('#wishShop').innerHTML=allItems.map(it=>`<div class="wish-card ${it.diff}"><div class="wish-name">${it.n}</div><div class="wish-cost">${it.cost} 积分</div><div class="wish-d">${it.d}</div><button class="btn-p" ${bal<it.cost?'disabled':''} onclick="redeemWish('${it.id}')">${bal>=it.cost?'兑换':'积分不足'}</button></div>`).join('');
  $('#wishHistory').innerHTML=(DB.wish&&DB.wish.redeemed&&DB.wish.redeemed.length)?DB.wish.redeemed.slice().reverse().map(x=>`<div class="rec-item"><span>${x.date} · ${esc(x.name)} · -${x.cost}积分</span></div>`).join(''):'<div class="hint">还没有兑换记录</div>';
}
function redeemWish(id){
  const it=WISH_ITEMS.find(x=>x.id===id) || (DB.customWishes||[]).find(x=>x.id===id); if(!it)return;
  const earned=calcPoints(); const used=(DB.wish&&DB.wish.redeemed||[]).reduce((s,x)=>s+x.cost,0);
  if(earned-used<it.cost){toast('积分不足');return;}
  if(!confirm(`确定花费 ${it.cost} 积分兑换「${it.n}」吗？`))return;
  DB.wish=DB.wish||{redeemed:[]}; DB.wish.redeemed.push({id:it.id,name:it.n,cost:it.cost,date:todayStr()}); saveDB(); renderWish(); toast(`兑换成功：${it.n}`);
}
function addCustomWish(){
  const n=$('#customWishName').value.trim(); const diff=$('#customWishDiff').value; if(!n){toast('请填写心愿名称');return;}
  const rule=CUSTOM_WISH_DIFF[diff]||CUSTOM_WISH_DIFF['小奖励'];
  const id='cw_'+Date.now();
  DB.customWishes=DB.customWishes||[];
  DB.customWishes.push({id,n,cost:rule.cost,diff:rule.diff,d:'自定义心愿'});
  $('#customWishName').value=''; saveDB(); renderWish(); toast('自定义心愿已添加');
}

/* ===== 同步 ===== */
function openSyncModal(){ $('#syncModal').classList.add('show'); renderGistStatus(); }
function closeSyncModal(){ $('#syncModal').classList.remove('show'); $('#syncExport').value=''; $('#syncImport').value=''; $('#syncCopy').style.display='none'; }
function exportSyncCode(){ try{ $('#syncExport').value=btoa(unescape(encodeURIComponent(JSON.stringify(DB)))); $('#syncCopy').style.display='block'; $('#syncExport').select(); }catch(e){toast('导出失败');} }
function copySyncCode(){ $('#syncExport').select(); document.execCommand('copy'); toast('已复制，去另一台设备粘贴导入'); }
function importSyncCode(){ const code=$('#syncImport').value.trim(); if(!code){toast('请粘贴同步码');return;} if(!confirm('导入将覆盖当前数据，确定？'))return; try{ const d=JSON.parse(decodeURIComponent(escape(atob(code)))); loadDBFromObject(d); }catch(e){toast('同步码无效');} }
// 统一的数据导入（同步码 / 数据文件 共用）：覆盖式写入
function loadDBFromObject(d){
  try{
    DB=(d.checkin||d.finance||d.weight||d.language)?migrateOld(d):Object.assign(defaultDB(),d);
    saveDB(); initAll(); closeSyncModal(); toast('导入成功 ✓');
  }catch(e){ toast('数据无效'); }
}
// 导出数据文件（.json）—— 文件不会被微信截断，本地预览也能用
function exportDataFile(){
  try{
    const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    const dt=new Date(), ds=dt.getFullYear()+String(dt.getMonth()+1).padStart(2,'0')+String(dt.getDate()).padStart(2,'0');
    a.href=URL.createObjectURL(blob); a.download='成长记数据_'+ds+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),2000);
    toast('已下载数据文件，发到另一台设备再导入即可');
  }catch(e){ toast('导出失败'); }
}
// 选择文件导入
function importDataFile(input){
  const f=input.files&&input.files[0]; if(!f){return;}
  const r=new FileReader();
  r.onload=()=>{ try{ const d=JSON.parse(r.result); loadDBFromObject(d); }catch(e){ toast('数据文件无效'); } input.value=''; };
  r.readAsText(f);
}
// ===== GitHub Gist 云端同步（真正的多设备互通） =====
const GIST_TOKEN_KEY='czj_gist_token', GIST_ID_KEY='czj_gist_id', GIST_FILENAME='chengzhangji.json';
function getGistToken(){ return localStorage.getItem(GIST_TOKEN_KEY)||''; }
function getGistId(){ return localStorage.getItem(GIST_ID_KEY)||''; }
function saveGistToken(){ const t=$('#gistToken').value.trim(); if(!t){toast('请输入 Token');return;} localStorage.setItem(GIST_TOKEN_KEY,t); renderGistStatus(); toast('Token 已保存（仅存本机）'); }
function renderGistStatus(){ const t=getGistToken(), id=getGistId(); if($('#gistStatus')) $('#gistStatus').innerHTML = (t?'✅ Token 已配置':'⚠️ 未配置 Token') + (id?' · 云端备份已建立':' · 未建立（首次上传将自动创建私有 Gist）'); }
async function gistApi(method,url,body){
  const res=await fetch(url,{method,headers:{'Authorization':'Bearer '+getGistToken(),'Content-Type':'application/json','Accept':'application/vnd.github+json'},body:body?JSON.stringify(body):undefined});
  if(!res.ok){ const e=await res.json().catch(()=>({})); throw new Error(e.message||('HTTP '+res.status)); }
  return res.json();
}
async function gistUpload(){
  const tok=getGistToken(); if(!tok){toast('请先粘贴并保存 GitHub Token');return;}
  try{
    const content=JSON.stringify(DB);
    const id=getGistId();
    if(!id){ const data=await gistApi('POST','https://api.github.com/gists',{public:false,files:{[GIST_FILENAME]:{content}}}); localStorage.setItem(GIST_ID_KEY,data.id); }
    else { await gistApi('PATCH','https://api.github.com/gists/'+id,{files:{[GIST_FILENAME]:{content}}}); }
    renderGistStatus(); toast('已上传到云端 ✓');
  }catch(e){ toast('上传失败：'+(e.message||e)); }
}
async function gistDownload(){
  const tok=getGistToken(), id=getGistId(); if(!tok||!id){toast('请先配置 Token 并完成过一次上传');return;}
  try{
    const data=await gistApi('GET','https://api.github.com/gists/'+id);
    const f=data.files&&data.files[GIST_FILENAME]; if(!f||!f.content){toast('云端没有找到数据');return;}
    loadDBFromObject(JSON.parse(f.content)); toast('已从云端同步 ✓');
  }catch(e){ toast('同步失败：'+(e.message||e)); }
}
// 同步链接：把整个数据库编码进 URL hash，另一台设备打开即自动导入（避免长同步码被截断）
function genSyncLink(){
  try{
    if(location.hostname==='localhost'||location.hostname==='127.0.0.1'){ toast('当前是本地预览，链接含 127.0.0.1 只有本机能开；请改用已部署的公网网址再生成'); }
    const code=btoa(unescape(encodeURIComponent(JSON.stringify(DB))));
    const url=location.origin+location.pathname+'#sync='+encodeURIComponent(code);
    $('#syncLinkOut').value=url; $('#syncLinkOut').style.display='block'; $('#syncCopyLink').style.display='block'; $('#syncLinkOut').select();
    toast('同步链接已生成，发给另一台设备打开即可导入');
  }catch(e){ toast('生成失败'); }
}
function tryHashSync(){
  const h=location.hash||'';
  const m=h.match(/#sync=(.+)$/);
  if(!m) return;
  const code=decodeURIComponent(m[1]);
  const ok=confirm('检测到同步链接，将用其中的数据覆盖本设备当前数据，确定导入？');
  if(ok){
    try{
      const d=JSON.parse(decodeURIComponent(escape(atob(code))));
      DB=(d.checkin||d.finance||d.weight||d.language)?migrateOld(d):Object.assign(defaultDB(),d);
      saveDB(); toast('已从同步链接导入数据 ✓');
    }catch(e){ toast('同步链接无效'); }
  }
  history.replaceState(null,'',location.pathname+location.search);
}

/* ===== 工具 ===== */
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

/* ===== 初始化 ===== */
function initAll(){
  $('#topDate').textContent=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'short'});
  $('#dietDate').value=todayStr(); $('#finDate').value=todayStr(); $('#catEventDate').value=todayStr(); $('#dietLogDate').value=todayStr();
  $('#finFilterMonth').value=todayStr().slice(0,7);
  ensureTaskMasters(); renderTodos(); renderSupp(); renderAishang(); renderPomo(); renderMusicPomo(); renderSleep(); renderDietDay(); renderWeekPlan(); renderBodyStats(); $('#pantryInput').value=DB.pantry||'';
  renderWorkoutToday(); renderWorkoutRec(); renderLang(); initFinSelects(); renderFinanceStats(); renderFinance(); renderRecurring(); renderAsset();
  renderReading(); renderCats(); renderBeauty(); renderTrending(); renderDouyin();
  setWeek(todayStr()); renderWeekly();
  loadOutfit(); renderWish();
  renderDietLog();
  loadMarket(); renderKnowledge();
  setInterval(loadMarket,5*60*1000);
  // 点开学习/训练视频时自动暂停音乐番茄
  document.addEventListener('click',e=>{
    const target=e.target.closest('a[href*="bilibili"],iframe[src*="bilibili"],.wo-play,.v-card a,.v-card iframe');
    if(target && !e.target.closest('#musicPomo') && musicPlaying){ pauseMusicPomo(); toast('学习视频打开，音乐番茄钟已自动暂停'); }
  });
}
buildBottomNav(); tryHashSync(); initAll();

/* PWA register */
if('serviceWorker' in navigator){ window.addEventListener('load',()=>{ navigator.serviceWorker.register('sw.js').catch(()=>{}); }); }
