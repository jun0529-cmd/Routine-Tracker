import { useState, useEffect, useRef } from "react";
import { auth, loginWithGoogle, logout, onAuthChange, saveChecks, loadChecks, saveRoutines, loadRoutines, loadWeekChecks } from "./firebase";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const CAT_META = {
  공부: { color: "#60A5FA", dim: "#1E3A5F", icon: "📖" },
  운동: { color: "#34D399", dim: "#1A3D2E", icon: "💪" },
  식단: { color: "#FBBF24", dim: "#3D2E0A", icon: "🥗" },
  휴식: { color: "#A78BFA", dim: "#2D1F4A", icon: "🌙" },
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

// Calculate streak
function calcStreak(allChecks, routines) {
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const ds = getDateStr(-i);
    const d = new Date(ds + "T00:00:00");
    const dk = DAY_KEYS[d.getDay()];
    const items = ["sat","sun"].includes(dk) ? (routines[dk]||[]) : [...(routines.weekday||[]),...(routines[dk]||[])];
    if (items.length === 0) continue;
    const dc = allChecks[ds] || {};
    const done = items.filter(it => dc[it.id]).length;
    if (done === items.length) streak++;
    else if (i > 0) break;
  }
  return streak;
}

const TABS = ["오늘", "이번 주", "루틴 편집"];

// Dark theme styles
const T = {
  bg: "#0A0A0F",
  surface: "#13131A",
  card: "#1A1A24",
  border: "#2A2A3A",
  borderLight: "#333344",
  text: "#F0F0F8",
  textSub: "#8888AA",
  textDim: "#55556A",
};

const iStyle = {
  width: "100%", background: T.card, border: `1.5px solid ${T.border}`,
  borderRadius: 8, padding: "9px 12px", color: T.text, fontSize: 13,
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};
function bStyle(bg, color) {
  return { background: bg, border: "none", borderRadius: 8, color, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" };
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [tab, setTab] = useState("오늘");
  const [checks, setChecks] = useState({});
  const [allChecks, setAllChecks] = useState({});
  const [routines, setRoutines] = useState(DEFAULT_ROUTINES);
  const [editDay, setEditDay] = useState("weekday");
  const [editingId, setEditingId] = useState(null);
  const [addingDay, setAddingDay] = useState(null);
  const [form, setForm] = useState({ label: "", category: "공부", note: "", time: "" });
  const [loading, setLoading] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const prevPct = useRef(0);
  const today = getDateStr(0);

  useEffect(() => {
    return onAuthChange(async (u) => {
      setUser(u);
      if (u) {
        setLoading(true);
        const r = await loadRoutines(u.uid);
        if (r) setRoutines(r);
        const c = await loadChecks(u.uid, today);
        setChecks(c);
        const dates = Array.from({length: 30}, (_, i) => getDateStr(-i));
        const wc = await loadWeekChecks(u.uid, dates);
        setAllChecks(wc);
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
  // Sort: incomplete first, complete last
  const sortedItems = [...todayItems].sort((a, b) => {
    const ac = checks[a.id] ? 1 : 0;
    const bc = checks[b.id] ? 1 : 0;
    return ac - bc;
  });
  const done = todayItems.filter(i=>checks[i.id]).length;
  const pct = todayItems.length ? Math.round((done/todayItems.length)*100) : 0;
  const ringColor = pct>=80?"#34D399":pct>=40?"#FBBF24":"#60A5FA";

  // Celebrate on 100%
  useEffect(() => {
    if (pct === 100 && prevPct.current < 100) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 3000);
    }
    prevPct.current = pct;
  }, [pct]);

  const streak = calcStreak({ ...allChecks, [today]: checks }, routines);

  const weekDates = Array.from({length:7}, (_,i) => getDateStr(i-6));
  const weekData = weekDates.map(ds => {
    const d = new Date(ds + "T00:00:00");
    const dk = DAY_KEYS[d.getDay()];
    const items = ["sat","sun"].includes(dk) ? (routines[dk]||[]) : [...(routines.weekday||[]),...(routines[dk]||[])];
    const dc = ds===today ? checks : (allChecks[ds]||{});
    return { ds, label: DAYS[d.getDay()], done: items.filter(it=>dc[it.id]).length, total: items.length, isToday: ds===today };
  });

  // Group by category
  const grouped = {};
  sortedItems.forEach(item => { (grouped[item.category]||(grouped[item.category]=[])).push(item); });

  // Loading
  if (user === undefined || loading) {
    return (
      <div style={{ minHeight:"100dvh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
        <div style={{ width:40, height:40, border:`3px solid ${T.border}`, borderTop:"3px solid #60A5FA", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}} @keyframes confetti{0%{transform:translateY(0) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}`}</style>
        <span style={{ fontSize:13, color:T.textSub }}>불러오는 중...</span>
      </div>
    );
  }

  // Login
  if (!user) {
    return (
      <div style={{ minHeight:"100dvh", background:T.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}} @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}`}</style>
        <div style={{ background:T.surface, borderRadius:24, padding:36, maxWidth:320, width:"100%", textAlign:"center", border:`1px solid ${T.border}`, animation:"fadeIn 0.4s ease" }}>
          <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
          <div style={{ fontSize:24, fontWeight:700, color:T.text, marginBottom:8, letterSpacing:"-0.5px" }}>루틴 트래커</div>
          <div style={{ fontSize:13, color:T.textSub, marginBottom:32, lineHeight:1.7 }}>매일 루틴을 체크하고<br/>성장을 기록해요</div>
          <button onClick={loginWithGoogle} style={{
            width:"100%", background:T.card, border:`1px solid ${T.borderLight}`,
            borderRadius:14, padding:"14px 20px", fontSize:14, fontWeight:600,
            color:T.text, cursor:"pointer", display:"flex", alignItems:"center",
            justifyContent:"center", gap:10, fontFamily:"inherit", transition:"all 0.2s",
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.8 6.5 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.8 6.5 29.1 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.8-1.8 13.4-4.7l-6.2-5.2C29.3 35.5 26.8 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.6 5.1C9.5 39.5 16.3 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.8l6.2 5.2C41 35.8 44 30.3 44 24c0-1.3-.1-2.7-.4-4z"/>
            </svg>
            Google로 시작하기
          </button>
          <div style={{ fontSize:11, color:T.textDim, marginTop:20, lineHeight:1.7 }}>내 루틴 데이터는 나만 볼 수 있어요</div>
        </div>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 24;

  return (
    <div style={{ minHeight:"100dvh", background:T.bg, color:T.text }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pop{0%{transform:scale(0.8);opacity:0}60%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes celebrateBg{0%,100%{opacity:0}20%,80%{opacity:1}}
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {/* 100% Celebrate */}
      {celebrate && (
        <div style={{ position:"fixed", inset:0, zIndex:999, pointerEvents:"none", display:"flex", alignItems:"center", justifyContent:"center", animation:"celebrateBg 3s ease" }}>
          <div style={{ fontSize:64, animation:"pop 0.5s ease" }}>🎉</div>
          {Array.from({length:12}).map((_,i) => (
            <div key={i} style={{
              position:"absolute", top:"-10%",
              left:`${(i/12)*100}%`,
              width:8, height:8, borderRadius:"50%",
              background:["#60A5FA","#34D399","#FBBF24","#A78BFA","#F87171"][i%5],
              animation:`confetti ${1.5+Math.random()}s ease ${Math.random()*0.5}s forwards`,
            }}/>
          ))}
          <div style={{ position:"absolute", background:"rgba(52,211,153,0.15)", border:"1px solid #34D399", borderRadius:16, padding:"12px 24px", color:"#34D399", fontSize:14, fontWeight:700, top:"40%", backdropFilter:"blur(8px)" }}>
            오늘 루틴 완료! 🔥
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{ background:T.surface, borderBottom:`1px solid ${T.border}`, paddingTop:"max(env(safe-area-inset-top,0px),16px)", padding:"max(env(safe-area-inset-top,0px),16px) 20px 0" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ animation:"fadeIn 0.4s ease" }}>
            <div style={{ fontSize:11, fontWeight:600, letterSpacing:"0.1em", color:T.textDim, textTransform:"uppercase", marginBottom:4 }}>
              {new Date().toLocaleDateString("ko-KR",{month:"long",day:"numeric",weekday:"short"})}
            </div>
            <div style={{ fontSize:22, fontWeight:700, color:T.text, letterSpacing:"-0.5px", display:"flex", alignItems:"center", gap:10 }}>
              오늘의 루틴
              {streak > 1 && (
                <span style={{ fontSize:12, fontWeight:700, color:"#FBBF24", background:"rgba(251,191,36,0.15)", border:"1px solid rgba(251,191,36,0.3)", borderRadius:20, padding:"2px 10px", display:"flex", alignItems:"center", gap:4 }}>
                  🔥 {streak}일 연속
                </span>
              )}
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            {/* Ring */}
            <div style={{ position:"relative", width:60, height:60 }}>
              <svg width={60} height={60} style={{ transform:"rotate(-90deg)" }}>
                <circle cx={30} cy={30} r={24} fill="none" stroke={T.border} strokeWidth={4}/>
                <circle cx={30} cy={30} r={24} fill="none" stroke={ringColor} strokeWidth={4}
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference-(pct/100)*circumference}
                  strokeLinecap="round"
                  style={{ transition:"stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.4s" }}/>
              </svg>
              <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <span style={{ fontSize:13, fontWeight:800, color:ringColor, lineHeight:1 }}>{pct}%</span>
              </div>
            </div>

            {/* User */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
              <img src={user.photoURL} alt="" style={{ width:32, height:32, borderRadius:"50%", border:`2px solid ${T.border}` }}/>
              <button onClick={logout} style={{ background:"none", border:"none", color:T.textDim, fontSize:10, cursor:"pointer", fontFamily:"inherit" }}>로그아웃</button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex" }}>
          {TABS.map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{
              background:"none", border:"none", cursor:"pointer", padding:"10px 14px",
              fontSize:13, fontWeight:tab===t?700:400,
              color:tab===t?T.text:T.textSub,
              borderBottom:tab===t?"2px solid #60A5FA":"2px solid transparent",
              transition:"all 0.2s", fontFamily:"inherit",
            }}>{t}</button>
          ))}
        </div>
      </div>

      <div style={{ padding:"16px 16px 60px", maxWidth:480, margin:"0 auto" }}>

        {/* ══ 오늘 ══ */}
        {tab==="오늘" && (
          <div style={{ animation:"slideUp 0.3s ease" }}>
            {/* Summary cards */}
            <div style={{ display:"flex", gap:8, marginBottom:20 }}>
              {[
                { v:done, l:"완료", c:"#34D399" },
                { v:todayItems.length-done, l:"남음", c:T.text },
                { v:`${pct}%`, l:"달성률", c:ringColor },
              ].map(s=>(
                <div key={s.l} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"12px 8px", flex:1, textAlign:"center" }}>
                  <div style={{ fontSize:22, fontWeight:800, color:s.c, letterSpacing:"-0.5px" }}>{s.v}</div>
                  <div style={{ fontSize:11, color:T.textSub, marginTop:2 }}>{s.l}</div>
                </div>
              ))}
            </div>

            {Object.entries(grouped).map(([cat, items]) => {
              const meta = CAT_META[cat]||CAT_META["공부"];
              const catDone = items.filter(i=>checks[i.id]).length;
              const catPct = items.length ? Math.round((catDone/items.length)*100) : 0;
              return (
                <div key={cat} style={{ marginBottom:16 }}>
                  {/* Category header */}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, padding:"0 2px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ fontSize:14 }}>{meta.icon}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:meta.color, letterSpacing:"0.05em" }}>{cat}</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      {/* Mini progress bar */}
                      <div style={{ width:48, height:3, background:T.border, borderRadius:2 }}>
                        <div style={{ height:"100%", width:`${catPct}%`, background:meta.color, borderRadius:2, transition:"width 0.4s" }}/>
                      </div>
                      <span style={{ fontSize:11, color:T.textSub }}>{catDone}/{items.length}</span>
                    </div>
                  </div>

                  {/* 식단 대원칙 */}
                  {cat==="식단" && (
                    <div style={{ background:T.card, border:`1px solid rgba(251,191,36,0.2)`, borderRadius:12, padding:"10px 14px", marginBottom:8 }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#FBBF24", marginBottom:8, letterSpacing:"0.08em", textTransform:"uppercase" }}>대원칙</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                        {DIET_PRINCIPLES.map(tag=>(
                          <span key={tag.label} style={{
                            fontSize:11, fontWeight:600,
                            color: tag.bad?"#F87171":"#34D399",
                            background: tag.bad?"rgba(248,113,113,0.1)":"rgba(52,211,153,0.1)",
                            border:`1px solid ${tag.bad?"rgba(248,113,113,0.25)":"rgba(52,211,153,0.25)"}`,
                            borderRadius:6, padding:"2px 8px",
                          }}>{tag.label}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {items.map(item => {
                    const checked = !!checks[item.id];
                    return (
                      <div key={item.id} onClick={()=>toggle(item.id)} style={{
                        display:"flex", alignItems:"center", gap:12,
                        background: checked ? T.card : T.surface,
                        border:`1px solid ${checked?T.border:T.borderLight}`,
                        borderLeft:`3px solid ${checked?T.border:meta.color}`,
                        borderRadius:12, padding:"12px 14px", marginBottom:6,
                        cursor:"pointer", transition:"all 0.2s",
                        opacity: checked ? 0.5 : 1,
                      }}>
                        <div style={{
                          width:22, height:22, borderRadius:7, flexShrink:0,
                          border:`2px solid ${checked?meta.color:T.borderLight}`,
                          background: checked?meta.color:"transparent",
                          display:"flex", alignItems:"center", justifyContent:"center",
                          transition:"all 0.2s",
                        }}>
                          {checked && <span style={{ color:T.bg, fontSize:11, fontWeight:900, lineHeight:1 }}>✓</span>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{
                            fontSize:14, fontWeight:checked?400:500,
                            color: checked?T.textSub:T.text,
                            textDecoration: checked?"line-through":"none",
                            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis",
                          }}>{item.label}</div>
                          {(item.time||item.note) && (
                            <div style={{ display:"flex", gap:6, marginTop:3, alignItems:"center" }}>
                              {item.time && (
                                <span style={{ fontSize:11, fontWeight:700, color:meta.color, background:meta.dim, borderRadius:5, padding:"1px 7px" }}>{item.time}</span>
                              )}
                              {item.note && <span style={{ fontSize:11, color:T.textDim }}>{item.note}</span>}
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
          <div style={{ animation:"slideUp 0.3s ease" }}>
            {/* Summary */}
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              {(()=>{
                const td=weekData.reduce((a,d)=>a+d.done,0);
                const ta=weekData.reduce((a,d)=>a+d.total,0);
                const avg=ta?Math.round((td/ta)*100):0;
                const perfect=weekData.filter(d=>d.total>0&&d.done===d.total).length;
                return [
                  {v:`${avg}%`,l:"평균 달성률",c:"#60A5FA"},
                  {v:td,l:"총 완료",c:"#34D399"},
                  {v:perfect,l:"완벽한 날",c:"#FBBF24"},
                  {v:`${streak}일`,l:"연속 달성",c:"#F87171"},
                ].map(s=>(
                  <div key={s.l} style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:"10px 6px", flex:1, textAlign:"center" }}>
                    <div style={{ fontSize:18, fontWeight:800, color:s.c, letterSpacing:"-0.5px" }}>{s.v}</div>
                    <div style={{ fontSize:10, color:T.textSub, marginTop:2 }}>{s.l}</div>
                  </div>
                ));
              })()}
            </div>

            {/* Day bars */}
            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden" }}>
              {weekData.map((d,i)=>{
                const p=d.total?Math.round((d.done/d.total)*100):0;
                const col=p>=80?"#34D399":p>=40?"#FBBF24":"#60A5FA";
                return (
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", background:d.isToday?T.card:"transparent", borderBottom:i<6?`1px solid ${T.border}`:"none" }}>
                    <div style={{ fontSize:13, fontWeight:d.isToday?800:500, color:d.isToday?T.text:T.textSub, width:20, textAlign:"center" }}>{d.label}</div>
                    {d.isToday && <div style={{ width:5, height:5, borderRadius:"50%", background:"#60A5FA", flexShrink:0 }}/>}
                    <div style={{ flex:1 }}>
                      <div style={{ height:6, background:T.border, borderRadius:3 }}>
                        <div style={{ height:"100%", width:`${p}%`, background:col, borderRadius:3, transition:"width 0.5s cubic-bezier(0.4,0,0.2,1)" }}/>
                      </div>
                    </div>
                    <div style={{ fontSize:12, fontWeight:700, color:col, minWidth:36, textAlign:"right" }}>{d.done}/{d.total}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ 루틴 편집 ══ */}
        {tab==="루틴 편집" && (
          <div style={{ animation:"slideUp 0.3s ease" }}>
            <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
              {[["weekday","평일 공통"],...DAY_KEYS.map((k,i)=>[k,DAYS[i]])].map(([k,label])=>(
                <button key={k} onClick={()=>{setEditDay(k);setEditingId(null);setAddingDay(null);}} style={{
                  background: editDay===k?"#60A5FA":T.surface,
                  border:`1px solid ${editDay===k?"#60A5FA":T.border}`,
                  color: editDay===k?T.bg:T.textSub,
                  borderRadius:20, padding:"5px 12px", fontSize:12,
                  fontWeight:editDay===k?700:400, cursor:"pointer", transition:"all 0.15s", fontFamily:"inherit",
                }}>{label}</button>
              ))}
            </div>

            <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, overflow:"hidden", marginBottom:8 }}>
              {(routines[editDay]||[]).length===0 && (
                <div style={{ padding:"24px", textAlign:"center", color:T.textDim, fontSize:13 }}>항목이 없어요</div>
              )}
              {(routines[editDay]||[]).map((item,i,arr)=>{
                const meta=CAT_META[item.category]||CAT_META["공부"];
                return (
                  <div key={item.id} style={{ borderBottom:i<arr.length-1?`1px solid ${T.border}`:"none" }}>
                    {editingId===item.id ? (
                      <div style={{ padding:"14px 16px", background:T.card }}>
                        <input value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder="항목 이름" style={iStyle}/>
                        <div style={{ display:"flex", gap:6, marginTop:6 }}>
                          <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{...iStyle,flex:1}}>
                            {Object.keys(CAT_META).map(c=><option key={c}>{c}</option>)}
                          </select>
                          <input value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} placeholder="시간" style={{...iStyle,flex:1}}/>
                        </div>
                        <input value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="메모" style={{...iStyle,marginTop:6}}/>
                        <div style={{ display:"flex", gap:6, marginTop:10 }}>
                          <button onClick={saveEdit} style={bStyle("#60A5FA",T.bg)}>저장</button>
                          <button onClick={()=>setEditingId(null)} style={bStyle(T.border,T.textSub)}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 16px" }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:meta.color, flexShrink:0 }}/>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:13, fontWeight:500, color:T.text }}>{item.label}</div>
                          {(item.time||item.note) && (
                            <div style={{ fontSize:11, color:T.textDim, marginTop:2 }}>
                              {item.time && <span style={{ color:meta.color, marginRight:6, fontWeight:700 }}>{item.time}</span>}
                              {item.note}
                            </div>
                          )}
                        </div>
                        <button onClick={()=>startEdit(editDay,item)} style={{ background:"none",border:"none",color:T.textSub,cursor:"pointer",fontSize:12,padding:"4px 6px",fontFamily:"inherit" }}>수정</button>
                        <button onClick={()=>deleteItem(editDay,item.id)} style={{ background:"none",border:"none",color:T.textDim,cursor:"pointer",fontSize:12,padding:"4px 6px",fontFamily:"inherit" }}>삭제</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {addingDay===editDay ? (
              <div style={{ background:T.surface, border:`1px solid ${T.border}`, borderRadius:16, padding:16 }}>
                <input value={form.label} onChange={e=>setForm(p=>({...p,label:e.target.value}))} placeholder="항목 이름 *" style={iStyle}/>
                <div style={{ display:"flex", gap:6, marginTop:6 }}>
                  <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{...iStyle,flex:1}}>
                    {Object.keys(CAT_META).map(c=><option key={c}>{c}</option>)}
                  </select>
                  <input value={form.time} onChange={e=>setForm(p=>({...p,time:e.target.value}))} placeholder="시간" style={{...iStyle,flex:1}}/>
                </div>
                <input value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="메모" style={{...iStyle,marginTop:6}}/>
                <div style={{ display:"flex", gap:6, marginTop:12 }}>
                  <button onClick={()=>addItem(editDay)} style={bStyle("#60A5FA",T.bg)}>추가</button>
                  <button onClick={()=>{setAddingDay(null);setForm({label:"",category:"공부",note:"",time:""});}} style={bStyle(T.border,T.textSub)}>취소</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>{setAddingDay(editDay);setEditingId(null);setForm({label:"",category:"공부",note:"",time:""});}} style={{
                width:"100%", background:"transparent", border:`1.5px dashed ${T.border}`,
                borderRadius:16, color:T.textDim, padding:"14px", cursor:"pointer",
                fontSize:13, transition:"all 0.2s", fontFamily:"inherit",
              }}>+ 항목 추가</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
