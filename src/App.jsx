import { useState, useEffect } from "react";
import { auth, loginWithGoogle, logout, onAuthChange, saveChecks, loadChecks, saveRoutines, loadRoutines, loadWeekChecks } from "./firebase";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const CAT_META = {
  공부: { color: "#3B82F6", bg: "#EFF6FF", icon: "📖" },
  운동: { color: "#10B981", bg: "#ECFDF5", icon: "💪" },
  식단: { color: "#F59E0B", bg: "#FFFBEB", icon: "🥗" },
  휴식: { color: "#8B5CF6", bg: "#F5F3FF", icon: "🌙" },
};

const DEFAULT_ROUTINES = {
  weekday: [
    { id: "study-read",  category: "공부", label: "독서",             note: "자투리 시간", time: "" },
    { id: "study-news",  category: "공부", label: "뉴스 · 경제 · AI", note: "자투리 시간", time: "" },
    { id: "study-vocab", category: "공부", label: "영단어 3회독",      note: "자투리 시간", time: "" },
    { id: "study-leet",  category: "공부", label: "리트",             note: "2시간 15분",  time: "17:00" },
    { id: "study-toeic", category: "공부", label: "토익",             note: "1시간 30분",  time: "19:15" },
    { id: "study-boost", category: "공부", label: "보충",             note: "리트/토익/경제/AI", time: "22:00" },
    { id: "study-eng",   category: "공부", label: "영어회화",         note: "30분",        time: "22:30" },
    { id: "study-book",  category: "공부", label: "독서",             note: "30분",        time: "23:00" },
  ],
  mon: [
    { id: "ex-pt-mon",    category: "운동", label: "PT + 배럭런",            note: "아침",   time: "06:00" },
    { id: "ex-meal-mon",  category: "식단", label: "아침 디팩",              note: "",       time: "" },
    { id: "ex-lunch-mon", category: "식단", label: "점심 적당히",            note: "",       time: "" },
    { id: "ex-din-mon",   category: "식단", label: "저녁 배럭 식단",         note: "",       time: "" },
  ],
  tue: [
    { id: "ex-chest-tue", category: "운동", label: "싯맨 — 가슴삼두 인터벌", note: "20분",  time: "06:00" },
    { id: "ex-meal-tue",  category: "식단", label: "아침 디팩",              note: "",       time: "" },
    { id: "ex-lunch-tue", category: "식단", label: "점심 적당히",            note: "",       time: "" },
    { id: "ex-din-tue",   category: "식단", label: "저녁 배럭 식단",         note: "",       time: "" },
  ],
  wed: [
    { id: "ex-pt-wed",    category: "운동", label: "PT + 배럭런",            note: "아침",   time: "06:00" },
    { id: "ex-meal-wed",  category: "식단", label: "아침 디팩",              note: "",       time: "" },
    { id: "ex-lunch-wed", category: "식단", label: "점심 적당히",            note: "",       time: "" },
    { id: "ex-din-wed",   category: "식단", label: "저녁 배럭 식단",         note: "",       time: "" },
  ],
  thu: [
    { id: "ex-back-thu",  category: "운동", label: "싯맨 — 등이두 인터벌",   note: "20분",  time: "06:00" },
    { id: "ex-meal-thu",  category: "식단", label: "아침 디팩",              note: "",       time: "" },
    { id: "ex-lunch-thu", category: "식단", label: "점심 적당히",            note: "",       time: "" },
    { id: "ex-din-thu",   category: "식단", label: "저녁 배럭 식단",         note: "",       time: "" },
  ],
  fri: [
    { id: "ex-pt-fri",    category: "운동", label: "PT + 배럭런",            note: "아침",   time: "06:00" },
    { id: "ex-meal-fri",  category: "식단", label: "아침 디팩",              note: "",       time: "" },
    { id: "ex-lunch-fri", category: "식단", label: "점심 적당히",            note: "",       time: "" },
    { id: "ex-din-fri",   category: "식단", label: "저녁 간단히",            note: "금요일", time: "" },
  ],
  sat: [
    { id: "study-sat",   category: "공부", label: "보충 or 독서 · 노트북",   note: "부족한 영역", time: "" },
    { id: "ex-meal-sat", category: "식단", label: "집 식단",                 note: "우둔살·베이글·생선·참치", time: "" },
    { id: "rest-sat",    category: "휴식", label: "충분한 휴식",             note: "",       time: "" },
  ],
  sun: [
    { id: "study-sun",       category: "공부", label: "보충 or 독서 · 노트북", note: "부족한 영역", time: "" },
    { id: "ex-shoulder-sun", category: "운동", label: "싯맨 — 어깨 인터벌",   note: "20분 · 복귀 후", time: "" },
    { id: "ex-meal-sun",     category: "식단", label: "집 식단",              note: "우둔살·베이글·생선·참치", time: "" },
    { id: "rest-sun",        category: "휴식", label: "충분한 휴식",          note: "",       time: "" },
  ],
};

const DIET_PRINCIPLES = [
  { label: "튀김 X", bad: true }, { label: "당류 X", bad: true },
  { label: "배달 X", bad: true }, { label: "기름 X", bad: true },
  { label: "식이섬유 ✓", bad: false }, { label: "중탄고단저지 ✓", bad: false }, { label: "물 많이 ✓", bad: false },
];

function getTodayKey() { return DAY_KEYS[new Date().getDay()]; }
function getDateStr(offset = 0) {
  const d = new Date(); d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function getTodayItems(routines) {
  const key = getTodayKey();
  if (["sat", "sun"].includes(key)) return routines[key] || [];
  return [...(routines.weekday || []), ...(routines[key] || [])];
}

const TABS = ["오늘", "이번 주", "루틴 편집"];
const iStyle = { width: "100%", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "9px 12px", color: "#1E293B", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };
function bStyle(bg, color) { return { background: bg, border: "none", borderRadius: 8, color, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }; }

export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [tab, setTab] = useState("오늘");
  const [checks, setChecks] = useState({});
  const [weekChecks, setWeekChecks] = useState({});
  const [routines, setRoutines] = useState(DEFAULT_ROUTINES);
  const [editDay, setEditDay] = useState("weekday");
  const [editingId, setEditingId] = useState(null);
  const [addingDay, setAddingDay] = useState(null);
  const [form, setForm] = useState({ label: "", category: "공부", note: "", time: "" });
  const [loading, setLoading] = useState(false);
  const today = getDateStr(0);

  // Auth listener
  useEffect(() => {
    return onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        setLoading(true);
        // Load routines
        const r = await loadRoutines(u.uid);
        if (r) setRoutines(r);
        // Load today checks
        const c = await loadChecks(u.uid, today);
        setChecks(c);
        // Load week checks
        const dates = Array.from({length:7}, (_,i) => getDateStr(i-6));
        const wc = await loadWeekChecks(u.uid, dates);
        setWeekChecks(wc);
        setLoading(false);
      }
    });
  }, []);

  async function toggle(id) {
    const u = { ...checks, [id]: !checks[id] };
    setChecks(u);
    if (user) await saveChecks(user.uid, today, u);
  }

  async function updateRoutines(newR) {
    setRoutines(newR);
    if (user) await saveRoutines(user.uid, newR);
  }

  function deleteItem(dayKey, id) { updateRoutines({ ...routines, [dayKey]: (routines[dayKey]||[]).filter(i=>i.id!==id) }); }
  function startEdit(dayKey, item) { setEditingId(item.id); setForm({ label:item.label, category:item.category, note:item.note, time:item.time }); }
  function saveEdit() {
    updateRoutines({ ...routines, [editDay]: (routines[editDay]||[]).map(i=>i.id===editingId?{...i,...form}:i) });
    setEditingId(null);
  }
  function addItem(dayKey) {
    if (!form.label.trim()) return;
    const id = `c-${dayKey}-${Date.now()}`;
    updateRoutines({ ...routines, [dayKey]: [...(routines[dayKey]||[]), {...form, id}] });
    setAddingDay(null); setForm({ label:"", category:"공부", note:"", time:"" });
  }

  const todayItems = getTodayItems(routines);
  const done = todayItems.filter(i=>checks[i.id]).length;
  const pct = todayItems.length ? Math.round((done/todayItems.length)*100) : 0;
  const ringColor = pct>=80?"#10B981":pct>=40?"#F59E0B":"#3B82F6";

  const weekDates = Array.from({length:7}, (_,i) => getDateStr(i-6));
  const weekData = weekDates.map(ds => {
    const d = new Date(ds + "T00:00:00");
    const dk = DAY_KEYS[d.getDay()];
    const items = ["sat","sun"].includes(dk) ? (routines[dk]||[]) : [...(routines.weekday||[]),...(routines[dk]||[])];
    const dc = weekChecks[ds] || (ds===today ? checks : {});
    return { ds, label: DAYS[d.getDay()], done: items.filter(it=>dc[it.id]).length, total: items.length, isToday: ds===today };
  });

  const grouped = {};
  todayItems.forEach(item => { (grouped[item.category]||(grouped[item.category]=[])).push(item); });

  // ── Loading screen ──
  if (user === undefined || loading) {
    return (
      <div style={{ minHeight:"100dvh", background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:12 }}>
        <div style={{ width:36, height:36, border:"3px solid #E2E8F0", borderTop:"3px solid #3B82F6", borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ fontSize:13, color:"#94A3B8" }}>불러오는 중...</span>
      </div>
    );
  }

  // ── Login screen ──
  if (!user) {
    return (
      <div style={{ minHeight:"100dvh", background:"#F1F5F9", display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <div style={{ background:"#fff", borderRadius:20, padding:32, maxWidth:320, width:"100%", textAlign:"center", boxShadow:"0 4px 24px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
          <div style={{ fontSize:22, fontWeight:700, color:"#0F172A", marginBottom:6, letterSpacing:"-0.5px" }}>루틴 트래커</div>
          <div style={{ fontSize:13, color:"#94A3B8", marginBottom:28, lineHeight:1.6 }}>매일 루틴을 체크하고<br/>진행률을 관리해요</div>
          <button onClick={loginWithGoogle} style={{
            width:"100%", background:"#fff", border:"1.5px solid #E2E8F0",
            borderRadius:12, padding:"13px 20px", fontSize:14, fontWeight:600,
            color:"#1E293B", cursor:"pointer", display:"flex", alignItems:"center",
            justifyContent:"center", gap:10, fontFamily:"inherit",
            boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.8 6.5 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.8 6.5 29.1 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.8-1.8 13.4-4.7l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.6 5.1C9.5 39.5 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.8l6.2 5.2C41 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Google로 시작하기
          </button>
          <div style={{ fontSize:11, color:"#CBD5E1", marginTop:16, lineHeight:1.6 }}>
            내 루틴 데이터는 나만 볼 수 있어요
          </div>
        </div>
      </div>
    );
  }

  // ── Main app ──
  return (
    <div style={{ minHeight:"100dvh", background:"#F1F5F9" }}>

      {/* HEADER */}
      <div style={{ background:"#fff", borderBottom:"1px solid #E2E8F0", paddingTop:"max(env(safe-area-inset-top,0px),16px)", padding:"max(env(safe-area-inset-top,0px),16px) 20px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.08em", color:"#94A3B8", textTransform:"uppercase", marginBottom:2 }}>
              {new Date().toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"})}
            </div>
            <div style={{ fontSize:20, fontWeight:700, color:"#0F172A", letterSpacing:"-0.5px" }}>오늘의 루틴</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {/* Ring */}
            <div style={{ position:"relative", width:56, height:56 }}>
              <svg width={56} height={56} style={{ transform:"rotate(-90deg)" }}>
                <circle cx={28} cy={28} r={22} fill="none" stroke="#E2E8F0" strokeWidth={4}/>
                <circle cx={28} cy={28} r={22} fill="none" stroke={ringColor} strokeWidth={4}
                  strokeDasharray={`${2*Math.PI*22}`}
                  strokeDashoffset={`${2*Math.PI*22-(pct/100)*2*Math.PI*22}`}
                  strokeLinecap="round" style={{ transition:"stroke-dashoffset 0.5s,stroke 0.4s" }}/>
              </svg>
              <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:12, fontWeight:700, color:"#0F172A" }}>{pct}%</span>
              </div>
            </div>
            {/* User + logout */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
              <img src={user.photoURL} alt="" style={{ width:28, height:28, borderRadius:"50%", border:"1.5px solid #E2E8F0" }} />
              <button onClick={logout} style={{ background:"none", border:"none", color:"#94A3B8", fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>로그아웃</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex" }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{ background:"none", border:"none", cursor:"pointer", padding:"8px 14px", fontSize:13, fontWeight:tab===t?600:400, color:tab===t?"#0F172A":"#94A3B8", borderBottom:tab===t?"2px solid #0F172A":"2px solid transparent", transition:"all 0.15s" }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 16px 40px", maxWidth:480, margin:"0 auto" }}>

        {/* ══ 오늘 ══ */}
        {tab==="오늘" && (
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {[{v:done,l:"완료",c:"#0F172A"},{v:todayItems.length-done,l:"남음",c:"#0F172A"},{v:`${pct}%`,l:"달성률",c:ringColor}].map(s=>(
                <div key={s.l} style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, padding:"10px", flex:1, textAlign:"center" }}>
                  <div style={{ fontSize:20, fontWeight:700, color:s.c }}>{s.v}</div>
                  <div style={{ fontSize:11, color:"#94A3B8", marginTop:1 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {Object.entries(grouped).map(([cat, items]) => {
              const meta = CAT_META[cat]||CAT_META["공부"];
              const catDone = items.filter(i=>checks[i.id]).length;
              return (
                <div key={cat} style={{ marginBottom:12 }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6, padding:"0 2px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontSize:13 }}>{meta.icon}</span>
                      <span style={{ fontSize:12, fontWeight:600, color:"#475569" }}>{cat}</span>
                    </div>
                    <span style={{ fontSize:11, color:"#94A3B8" }}>{catDone}/{items.length}</span>
                  </div>

                  {cat==="식단" && (
                    <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"10px 14px", marginBottom:8 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:"#92400E", marginBottom:7 }}>대원칙</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                        {DIET_PRINCIPLES.map(tag=>(
                          <span key={tag.label} style={{ fontSize:11, fontWeight:600, color:tag.bad?"#B45309":"#065F46", background:tag.bad?"#FEF3C7":"#D1FAE5", border:`1px solid ${tag.bad?"#FCD34D":"#6EE7B7"}`, borderRadius:5, padding:"2px 8px" }}>{tag.label}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {items.map(item => {
                    const checked = !!checks[item.id];
                    return (
                      <div key={item.id} onClick={()=>toggle(item.id)} style={{ display:"flex", alignItems:"center", gap:12, background:checked?"#F8FAFC":"#fff", border:"1px solid #E2E8F0", borderLeft:`3px solid ${checked?"#CBD5E1":meta.color}`, borderRadius:10, padding:"11px 14px", marginBottom:6, cursor:"pointer", transition:"all 0.15s", opacity:checked?0.6:1 }}>
                        <div style={{ width:20, height:20, borderRadius:6, flexShrink:0, border:`2px solid ${checked?meta.color:"#CBD5E1"}`, background:checked?meta.color:"transparent", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
                          {checked && <span style={{ color:"#fff", fontSize:10, fontWeight:800 }}>✓</span>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:14, fontWeight:500, color:checked?"#94A3B8":"#1E293B", textDecoration:checked?"line-through":"none", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.label}</div>
                          {(item.time||item.note) && (
                            <div style={{ display:"flex", gap:6, marginTop:2, alignItems:"center" }}>
                              {item.time && <span style={{ fontSize:11, fontWeight:600, color:meta.color, background:meta.bg, borderRadius:4, padding:"1px 6px" }}>{item.time}</span>}
                              {item.note && <span style={{ fontSize:11, color:"#94A3B8" }}>{item.note}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ══ 이번 주 ══ */}
        {tab==="이번 주" && (
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {(()=>{
                const td=weekData.reduce((a,d)=>a+d.done,0);
                const ta=weekData.reduce((a,d)=>a+d.total,0);
                const avg=ta?Math.round((td/ta)*100):0;
                const perfect=weekData.filter(d=>d.total>0&&d.done===d.total).length;
                return [{v:`${avg}%`,l:"평균 달성률",c:"#3B82F6"},{v:td,l:"총 완료",c:"#10B981"},{v:perfect,l:"완벽한 날",c:"#F59E0B"}].map(s=>(
                  <div key={s.l} style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:10, padding:"12px", flex:1, textAlign:"center" }}>
                    <div style={{ fontSize:22, fontWeight:700, color:s.c }}>{s.v}</div>
                    <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>{s.l}</div>
                  </div>
                ));
              })()}
            </div>
            <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, overflow:"hidden" }}>
              {weekData.map((d,i)=>{
                const p=d.total?Math.round((d.done/d.total)*100):0;
                const col=p>=80?"#10B981":p>=40?"#F59E0B":"#3B82F6";
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 16px", background:d.isToday?"#F8FAFC":"#fff", borderBottom:i<6?"1px solid #F1F5F9":"none" }}>
                    <div style={{ fontSize:13, fontWeight:d.isToday?700:500, color:d.isToday?"#0F172A":"#64748B", width:20, textAlign:"center" }}>{d.label}</div>
                    {d.isToday && <div style={{ width:4, height:4, borderRadius:"50%", background:"#3B82F6" }}/>}
                    <div style={{ flex:1 }}>
                      <div style={{ height:6, background:"#F1F5F9", borderRadius:3 }}>
                        <div style={{ height:"100%", width:`${p}%`, background:col, borderRadius:3, transition:"width 0.4s" }}/>
                      </div>
                    </div>
                    <div style={{ fontSize:12, fontWeight:600, color:col, minWidth:36, textAlign:"right" }}>{d.done}/{d.total}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ 루틴 편집 ══ */}
        {tab==="루틴 편집" && (
          <div>
            <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
              {[["weekday","평일 공통"],...DAY_KEYS.map((k,i)=>[k,DAYS[i]])].map(([k,label])=>(
                <button key={k} onClick={()=>{setEditDay(k);setEditingId(null);setAddingDay(null);}} style={{ background:editDay===k?"#0F172A":"#fff", border:`1px solid ${editDay===k?"#0F172A":"#E2E8F0"}`, color:editDay===k?"#fff":"#64748B", borderRadius:20, padding:"5px 12px", fontSize:12, fontWeight:editDay===k?600:400, cursor:"pointer", transition:"all 0.15s" }}>{label}</button>
              ))}
            </div>

            <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, overflow:"hidden", marginBottom:8 }}>
              {(routines[editDay]||[]).length===0 && <div style={{ padding:"20px", textAlign:"center", color:"#94A3B8", fontSize:13 }}>항목이 없어요</div>}
              {(routines[editDay]||[]).map((item,i,arr)=>{
                const meta=CAT_META[item.category]||CAT_META["공부"];
                return (
                  <div key={item.id} style={{ borderBottom:i<arr.length-1?"1px solid #F1F5F9":"none" }}>
                    {editingId===item.id ? (
                      <div style={{ padding:"12px 14px", background:"#F8FAFC" }}>
                        <input value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder="항목 이름" style={iStyle}/>
                        <div style={{ display:"flex", gap:6, marginTop:6 }}>
                          <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{...iStyle,flex:1}}>
                            {Object.keys(CAT_META).map(c=><option key={c}>{c}</option>)}
                          </select>
                          <input value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} placeholder="시간" style={{...iStyle,flex:1}}/>
                        </div>
                        <input value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="메모" style={{...iStyle,marginTop:6}}/>
                        <div style={{ display:"flex", gap:6, marginTop:8 }}>
                          <button onClick={saveEdit} style={bStyle("#0F172A","#fff")}>저장</button>
                          <button onClick={()=>setEditingId(null)} style={bStyle("#F1F5F9","#64748B")}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"12px 14px" }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:meta.color, flexShrink:0 }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:"#1E293B" }}>{item.label}</div>
                          {(item.time||item.note) && (
                            <div style={{ fontSize:11, color:"#94A3B8", marginTop:2 }}>
                              {item.time && <span style={{ color:meta.color, marginRight:5, fontWeight:600 }}>{item.time}</span>}
                              {item.note}
                            </div>
                          )}
                        </div>
                        <button onClick={()=>startEdit(editDay,item)} style={{ background:"none", border:"none", color:"#94A3B8", cursor:"pointer", fontSize:12, padding:"4px 6px" }}>수정</button>
                        <button onClick={()=>deleteItem(editDay,item.id)} style={{ background:"none", border:"none", color:"#CBD5E1", cursor:"pointer", fontSize:12, padding:"4px 6px" }}>삭제</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {addingDay===editDay ? (
              <div style={{ background:"#fff", border:"1px solid #E2E8F0", borderRadius:12, padding:14 }}>
                <input value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder="항목 이름 *" style={iStyle}/>
                <div style={{ display:"flex", gap:6, marginTop:6 }}>
                  <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{...iStyle,flex:1}}>
                    {Object.keys(CAT_META).map(c=><option key={c}>{c}</option>)}
                  </select>
                  <input value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} placeholder="시간" style={{...iStyle,flex:1}}/>
                </div>
                <input value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="메모" style={{...iStyle,marginTop:6}}/>
                <div style={{ display:"flex", gap:6, marginTop:10 }}>
                  <button onClick={()=>addItem(editDay)} style={bStyle("#0F172A","#fff")}>추가</button>
                  <button onClick={()=>{setAddingDay(null);setForm({label:"",category:"공부",note:"",time:""});}} style={bStyle("#F1F5F9","#64748B")}>취소</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>{setAddingDay(editDay);setEditingId(null);setForm({label:"",category:"공부",note:"",time:""}); }} style={{ width:"100%", background:"#fff", border:"1.5px dashed #CBD5E1", borderRadius:12, color:"#94A3B8", padding:"12px", cursor:"pointer", fontSize:13, transition:"border-color 0.15s" }}>+ 항목 추가</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
