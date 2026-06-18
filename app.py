"""German Vocabulary Study App v6 — streamlit run app.py"""
import os, glob, re, base64, math
import streamlit as st
import pandas as pd
import streamlit.components.v1 as components

ROOT          = os.path.dirname(os.path.abspath(__file__))
TOP_LEVELS    = ["A1", "A2", "B1", "B2"]
ROWS_PER_PAGE = 50
AUDIO_EXTS    = {".mp3", ".wav", ".ogg", ".m4a", ".mpga"}

st.set_page_config(page_title="🇩🇪 German Vocab Studio", page_icon="🎧",
                   layout="wide", initial_sidebar_state="collapsed")

# ── Session state ─────────────────────────────────────────────────────────────
for k, v in [("theme","dark"),("cur_page",1),("last_search",""),
             ("quiz_mode",False),("quiz_idx",0),("quiz_score",0)]:
    if k not in st.session_state: st.session_state[k] = v

IS_DARK = st.session_state.theme == "dark"

# ── Palettes ──────────────────────────────────────────────────────────────────
if IS_DARK:
    BG="#0f0c29"; TEXT="#e2e8f0"; TEXT2="#94a3b8"; ACCENT="#a78bfa"
    CARD="rgba(255,255,255,0.05)"; CARD_BD="rgba(255,255,255,0.08)"
    INP_BG="rgba(255,255,255,0.07)"; INP_BD="rgba(255,255,255,0.14)"; INP_CLR="#e2e8f0"
    DROP_BG="#1e1b4b"; DROP_CLR="#e2e8f0"; DROP_BD="rgba(255,255,255,0.12)"
    DIV="rgba(255,255,255,0.08)"
    T_DE="#e2e8f0"; T_EX="#94a3b8"; T_HI="#f9a8d4"
    T_HDR_BG="rgba(26,16,64,0.97)"; T_HDR_CLR="#94a3b8"
    T_HDR="rgba(99,102,241,0.18)"; T_STRIPE="rgba(255,255,255,0.025)"
    T_HOVER="rgba(167,139,250,0.10)"; T_BD="rgba(255,255,255,0.05)"; T_BG="transparent"
    BTN_BG="rgba(139,92,246,0.20)"; BTN_CLR="#a78bfa"; BTN_HOV="rgba(139,92,246,0.40)"
    BTN_ACT="rgba(56,189,248,0.25)"; BTN_ACT_C="#38bdf8"; BODY_BG="transparent"
else:
    BG="#f0f4ff"; TEXT="#1e293b"; TEXT2="#475569"; ACCENT="#6d28d9"
    CARD="rgba(255,255,255,0.85)"; CARD_BD="rgba(0,0,0,0.08)"
    INP_BG="#ffffff"; INP_BD="rgba(0,0,0,0.18)"; INP_CLR="#1e293b"
    DROP_BG="#ffffff"; DROP_CLR="#1e293b"; DROP_BD="rgba(0,0,0,0.15)"
    DIV="rgba(0,0,0,0.08)"
    T_DE="#1e293b"; T_EX="#475569"; T_HI="#9d174d"
    T_HDR_BG="rgba(240,244,255,0.98)"; T_HDR_CLR="#64748b"
    T_HDR="rgba(99,102,241,0.10)"; T_STRIPE="rgba(0,0,0,0.025)"
    T_HOVER="rgba(109,40,217,0.05)"; T_BD="rgba(0,0,0,0.06)"; T_BG="transparent"
    BTN_BG="rgba(109,40,217,0.12)"; BTN_CLR="#6d28d9"; BTN_HOV="rgba(109,40,217,0.25)"
    BTN_ACT="rgba(2,132,199,0.15)"; BTN_ACT_C="#0284c7"; BODY_BG="rgba(240,244,255,0.6)"

st.markdown(f"""<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500&display=swap');
html,body,[class*="css"]{{font-family:'Inter',sans-serif;font-size:16px}}
.stApp{{background:linear-gradient(135deg,{BG} 0%,{BG}dd 100%);min-height:100vh}}
/* hide Streamlit's own sidebar & hamburger completely */
[data-testid="stSidebar"]{{display:none!important}}
[data-testid="collapsedControl"]{{display:none!important}}
/* metrics */
[data-testid="stMetric"]{{background:{CARD};border-radius:12px;padding:12px 18px;border:1px solid {CARD_BD}}}
[data-testid="stMetricLabel"]{{color:{TEXT2}!important;font-size:.78rem!important}}
[data-testid="stMetricValue"]{{color:{ACCENT}!important;font-weight:700!important;font-size:1.6rem!important}}
/* search input */
[data-testid="stTextInput"] input{{background:{INP_BG}!important;border:1px solid {INP_BD}!important;border-radius:10px!important;color:{INP_CLR}!important;font-size:1rem!important;padding:10px 14px!important}}
[data-testid="stTextInput"] input::placeholder{{color:{TEXT2}!important;opacity:1!important}}
/* selects */
[data-baseweb="select"]>div{{background:{INP_BG}!important;border:1px solid {INP_BD}!important;border-radius:10px!important;color:{INP_CLR}!important}}
[data-baseweb="select"] span{{color:{INP_CLR}!important}}
[data-baseweb="select"] svg{{fill:{INP_CLR}!important}}
[data-baseweb="popover"] [role="listbox"]{{background:{DROP_BG}!important;border:1px solid {DROP_BD}!important;border-radius:10px!important}}
[data-baseweb="popover"] li{{color:{DROP_CLR}!important;background:{DROP_BG}!important}}
[data-baseweb="popover"] li:hover{{background:{CARD}!important}}
[data-baseweb="popover"] [aria-selected="true"]{{background:{ACCENT}22!important}}
/* select labels */
[data-testid="stSelectbox"] label{{color:{TEXT2}!important;font-size:.8rem!important;font-weight:500!important}}
/* divider */
hr{{border-color:{DIV}!important}}
h1,h2,h3{{color:{TEXT}!important}}
p,li,.stCaption{{color:{TEXT2}!important}}
/* pagination buttons */
button[kind="secondary"]{{background:{CARD}!important;border:1px solid {CARD_BD}!important;color:{TEXT}!important;border-radius:10px!important}}
/* theme toggle */
.theme-btn>div>button{{
  background:{CARD}!important;border:1px solid {CARD_BD}!important;
  color:{TEXT}!important;border-radius:50px!important;
  padding:8px 18px!important;font-size:.9rem!important;font-weight:500!important;
}}
/* nav bar container */
.nav-bar{{
  display:flex;align-items:flex-end;gap:16px;
  background:{CARD};border:1px solid {CARD_BD};
  border-radius:16px;padding:16px 20px;margin-bottom:8px;
  backdrop-filter:blur(12px);
}}
/* MOBILE QUIZ STYLES */
@media (max-width:768px){{
  .quiz-container{{padding:8px!important;max-width:100%!important}}
  .quiz-image{{max-width:120px!important;height:auto!important;margin:8px auto!important}}
  .voice-options{{display:flex;gap:6px;justify-content:center;align-items:center;margin:12px 0!important;flex-wrap:nowrap}}
  .voice-btn{{flex:1;min-width:0;padding:8px 6px!important;font-size:.7rem!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
  .answer-grid{{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0!important}}
  .answer-btn{{width:100%;padding:12px!important;font-size:.85rem!important;min-height:50px!important}}
  .nav-footer{{display:flex;gap:8px;justify-content:space-between;align-items:center;margin-top:16px!important}}
  .nav-footer button{{flex:1;padding:10px!important;font-size:.8rem!important}}
}}
@media (min-width:769px){{
  .quiz-container{{padding:16px;max-width:800px;margin:0 auto}}
  .quiz-image{{max-width:180px;height:auto;margin:12px auto}}
  .voice-options{{display:flex;gap:12px;justify-content:center;align-items:center;margin:16px 0;flex-wrap:nowrap}}
  .voice-btn{{flex:1;min-width:80px;padding:10px 16px;font-size:.85rem;white-space:nowrap}}
  .answer-grid{{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:20px 0}}
  .answer-btn{{width:100%;padding:14px;font-size:.9rem;min-height:60px}}
  .nav-footer{{display:flex;gap:12px;justify-content:flex-end;align-items:center;margin-top:20px}}
  .nav-footer button{{min-width:100px;padding:12px 20px;font-size:.9rem}}
}}
.quiz-image-wrapper{{text-align:center;margin:12px 0}}
.voice-btn,.answer-btn{{border:none;border-radius:10px;background:{BTN_BG};color:{BTN_CLR};cursor:pointer;font-weight:500;transition:all .2s;outline:none}}
.voice-btn:hover,.answer-btn:hover{{background:{BTN_HOV};transform:translateY(-2px)}}
.voice-btn:active,.answer-btn:active{{transform:scale(.98)}}
.voice-btn.loading,.answer-btn.loading{{opacity:.6;cursor:not-allowed}}
.answer-btn.selected{{background:{BTN_ACT};color:{BTN_ACT_C}}}
.home-btn{{background:{CARD};border:1px solid {CARD_BD};color:{TEXT};padding:10px 14px;border-radius:10px;cursor:pointer;font-weight:500;transition:.2s}}
.home-btn:hover{{background:{CARD_BD}}}
.skip-btn{{background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#ef4444;padding:10px 14px;border-radius:10px;cursor:pointer;font-weight:500;transition:.2s}}
.skip-btn:hover{{background:rgba(239,68,68,.25)}}
.quiz-progress{{height:4px;background:{DIV};border-radius:4px;overflow:hidden;margin:8px 0}}
.quiz-progress-bar{{height:100%;background:linear-gradient(90deg,{ACCENT},{ACCENT}dd);transition:width .3s}}
.loading-spinner{{display:inline-block;width:16px;height:16px;border:2px solid {BTN_BG};border-top-color:{BTN_CLR};border-radius:50%;animation:spin .8s linear infinite}}
@keyframes spin{{to{{transform:rotate(360deg)}}}}
</style>""", unsafe_allow_html=True)


# ── Helpers ───────────────────────────────────────────────────────────────────
@st.cache_data(show_spinner=False)
def discover_structure(root):
    result = {}
    for level in TOP_LEVELS:
        lp = os.path.join(root, level)
        if not os.path.isdir(lp): continue
        result[level] = {}
        for xlsx in sorted(glob.glob(os.path.join(lp, "**", "*.xlsx"), recursive=True)):
            chapter_dir  = os.path.dirname(xlsx)
            chapter_name = os.path.relpath(chapter_dir, lp)
            if chapter_name in result[level]: continue
            adirs = [os.path.join(chapter_dir, d) for d in os.listdir(chapter_dir)
                     if os.path.isdir(os.path.join(chapter_dir, d))]
            result[level][chapter_name] = (xlsx, adirs)
    return result

@st.cache_data(show_spinner=False)
def load_excel(path):
    df = pd.read_excel(path, dtype=str)
    df.dropna(how="all", inplace=True)
    df.reset_index(drop=True, inplace=True)
    df.fillna("", inplace=True)
    df.columns = [c.strip() for c in df.columns]
    return df

@st.cache_data(show_spinner=False)
def index_audio(audio_dirs_tuple):
    by_stem, by_index = {}, {}
    dirs_sorted = sorted(audio_dirs_tuple,
        key=lambda d: (0 if os.path.basename(d).lower()=="single" else
                       1 if os.path.basename(d).lower()=="audios" else 2))
    for adir in dirs_sorted:
        if not os.path.isdir(adir): continue
        for fname in sorted(os.listdir(adir)):
            if os.path.splitext(fname)[1].lower() not in AUDIO_EXTS: continue
            path = os.path.join(adir, fname)
            stem = os.path.splitext(fname)[0].strip()
            m = re.match(r'^(\d+)[_\s]+(.*)', stem)
            if m:
                idx = int(m.group(1)); word = m.group(2).strip()
                if idx not in by_index:   by_index[idx] = path
                if word.lower() not in by_stem: by_stem[word.lower()] = path
                first = word.split(",")[0].strip().lower()
                if first and first not in by_stem: by_stem[first] = path
            else:
                if stem.lower() not in by_stem: by_stem[stem.lower()] = path
    return by_stem, by_index

def resolve_audio(row_1based, german_val, by_stem, by_index):
    g = german_val.strip()
    if not g: return by_index.get(row_1based)
    for key in [g.lower(), g.split(",")[0].strip().lower(),
                g.split()[0].lower() if g else ""]:
        if key in by_stem: return by_stem[key]
    return by_index.get(row_1based)

def auto_cols(df):
    cols = df.columns.tolist()
    def pick(*kws, default=cols[0]):
        for kw in kws:
            for c in cols:
                if kw.lower() in c.lower(): return c
        return default
    return {
        "german" : pick("vocab word","verb","word","german"),
        "english": pick("english meaning","english"),
        "hindi"  : pick("hindi meaning","hindi","devanagari"),
        "de_sent": pick("example sentence (german","sentence (german", default=None),
        "en_sent": pick("example sentence (english","sentence (english", default=None),
        "hi_sent": pick("example sentence (hindi","sentence (hindi", default=None),
    }

def b64(path):
    with open(path,"rb") as f: return base64.b64encode(f.read()).decode()

def esc(s):
    return str(s).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace('"',"&quot;")


# ── Discover structure ────────────────────────────────────────────────────────
structure = discover_structure(ROOT)
if not structure: st.error("No A1/A2/B1/B2 folders found next to app.py"); st.stop()
avail = [l for l in TOP_LEVELS if l in structure and structure[l]]

# ── Top header bar ────────────────────────────────────────────────────────────
lc = {"A1":"🟢","A2":"🔵","B1":"🟠","B2":"🔴"}
lvl_color = {"A1":"#22c55e","A2":"#38bdf8","B1":"#f97316","B2":"#ef4444"}

h_title, h_theme = st.columns([8, 1])
with h_title:
    st.markdown(f"<h2 style='margin:0;padding:8px 0 4px;color:{TEXT}'>🇩🇪 German Vocab Studio</h2>",
                unsafe_allow_html=True)
with h_theme:
    st.markdown('<div class="theme-btn">', unsafe_allow_html=True)
    if st.button("☀️ Light" if IS_DARK else "🌙 Dark", key="theme_tog", help="Toggle theme"):
        st.session_state.theme = "light" if IS_DARK else "dark"
        st.rerun()
    st.markdown('</div>', unsafe_allow_html=True)

# ── Level + Chapter selector (horizontal inline) ──────────────────────────────
n1, n2, n3 = st.columns([1, 3, 2])
with n1:
    level = st.selectbox("Level", avail,
                         format_func=lambda l: f"{lc.get(l,'📚')} {l}")
with n2:
    chapters = list(structure[level].keys())
    chapter  = st.selectbox("Chapter", chapters)
with n3:
    # live dot indicator
    dot = lvl_color.get(level, ACCENT)
    st.markdown(f"""<div style='padding-top:28px;display:flex;align-items:center;gap:8px'>
      <span style='width:10px;height:10px;border-radius:50%;background:{dot};display:inline-block;flex-shrink:0'></span>
      <span style='color:{TEXT2};font-size:.88rem;font-weight:500'>{level} · {chapter}</span>
    </div>""", unsafe_allow_html=True)

st.divider()

# ── Load data ─────────────────────────────────────────────────────────────────
xlsx_path, audio_dirs = structure[level][chapter]
df = load_excel(xlsx_path)
by_stem, by_idx = index_audio(tuple(audio_dirs))
cols = auto_cols(df)
col_de, col_en, col_hi = cols["german"], cols["english"], cols["hindi"]
col_de_s, col_en_s, col_hi_s = cols["de_sent"], cols["en_sent"], cols["hi_sent"]

audio_map: dict = {}
for i, row in df.iterrows():
    p = resolve_audio(i+1, str(row.get(col_de,"")), by_stem, by_idx)
    if p: audio_map[i] = p

match_pct = int(100 * len(audio_map) / max(1, len(df)))

# ── Metrics ───────────────────────────────────────────────────────────────────
m1, m2 = st.columns(2)
m1.metric("Total Words", len(df))
m2.metric("Audio Coverage", f"{match_pct}%")
st.divider()

# ── Search ────────────────────────────────────────────────────────────────────
search = st.text_input("s", placeholder="🔍  Search any column …",
                       label_visibility="collapsed")

all_text_cols = [c for c in df.columns if not c.startswith("Unnamed")]
if search.strip():
    q = re.escape(search.strip())
    mask = df[all_text_cols].apply(
        lambda col: col.astype(str).str.contains(q, case=False, na=False)
    ).any(axis=1)
    df_view = df[mask].copy()
else:
    df_view = df.copy()

if df_view.empty:
    st.warning("No results found."); st.stop()

if search != st.session_state.last_search:
    st.session_state.last_search = search
    st.session_state.cur_page = 1

# ── Pagination ────────────────────────────────────────────────────────────────
total_pages = max(1, math.ceil(len(df_view) / ROWS_PER_PAGE))
page = max(1, min(int(st.session_state.cur_page), total_pages))
start = (page - 1) * ROWS_PER_PAGE
end   = start + ROWS_PER_PAGE

pa, pb, pc = st.columns([1, 1, 5])
with pa:
    if st.button("◀ Prev", disabled=(page == 1), use_container_width=True):
        st.session_state.cur_page = page - 1; st.rerun()
with pb:
    if st.button("Next ▶", disabled=(page == total_pages), use_container_width=True):
        st.session_state.cur_page = page + 1; st.rerun()
with pc:
    st.markdown(
        f"<div style='padding-top:10px;color:{TEXT2};font-size:.9rem'>"
        f"Page <b style='color:{TEXT}'>{page}</b> of {total_pages}"
        f" &nbsp;·&nbsp; rows {start+1}–{min(end,len(df_view))} of"
        f" <b style='color:{TEXT}'>{len(df_view)}</b></div>",
        unsafe_allow_html=True)

orig_indices = df_view.index.tolist()[start:end]
df_page = df_view.iloc[start:end]

# ── Base64 encode audio for this page ────────────────────────────────────────
page_b64: dict = {}
for oi in orig_indices:
    if oi in audio_map:
        try: page_b64[oi] = b64(audio_map[oi])
        except Exception: pass

# ── Build HTML rows ───────────────────────────────────────────────────────────
rows_html = []
for dp, oi in enumerate(orig_indices):
    row = df.loc[oi]
    c_a = esc(str(row.get(col_de,  "")).strip())
    c_b = esc(str(row.get(col_de_s,"")).strip()) if col_de_s else ""
    c_c = esc(str(row.get(col_en,  "")).strip())
    c_d = esc(str(row.get(col_en_s,"")).strip()) if col_en_s else ""
    c_e = esc(str(row.get(col_hi,  "")).strip())
    c_f = esc(str(row.get(col_hi_s,"")).strip()) if col_hi_s else ""

    if oi in page_b64:
        ext  = os.path.splitext(audio_map[oi])[1].lstrip(".") or "mpeg"
        mime = {"mp3":"mpeg","wav":"wav","ogg":"ogg","m4a":"mp4","mpga":"mpeg"}.get(ext,"mpeg")
        audio_cell = (
            f'<audio id="a{oi}" src="data:audio/{mime};base64,{page_b64[oi]}" preload="none"></audio>'
            f'<button class="play-btn" onclick="playRow({oi})">'
            f'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"'
            f' stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'
            f'<circle cx="12" cy="12" r="10"/>'
            f'<polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none"/>'
            f'</svg></button>')
    else:
        audio_cell = '<span class="no-aud">—</span>'

    bg = T_STRIPE if dp % 2 == 0 else T_BG
    rows_html.append(
        f'<tr style="background:{bg}">'
        f'<td class="cg">{audio_cell}</td>'
        f'<td class="ca">{c_a}</td>'
        f'<td class="cb">{c_b}</td>'
        f'<td class="cc">{c_c}</td>'
        f'<td class="cd">{c_d}</td>'
        f'<td class="ce">{c_e}</td>'
        f'<td class="cf">{c_f}</td>'
        f'</tr>')

table_h = min(780, 54 + 80 * len(df_page))

html = f"""<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Noto+Sans+Devanagari:wght@400;500&display=swap" rel="stylesheet">
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
html{{scrollbar-width:thin;scrollbar-color:{ACCENT}60 transparent}}
::-webkit-scrollbar{{width:6px;height:6px}}
::-webkit-scrollbar-track{{background:transparent}}
::-webkit-scrollbar-thumb{{background:{ACCENT}60;border-radius:4px}}
::-webkit-scrollbar-thumb:hover{{background:{ACCENT}}}
body{{font-family:'Inter',sans-serif;background:{BODY_BG};color:{T_DE};font-size:15px}}
table{{width:100%;border-collapse:collapse;table-layout:auto}}
thead th{{
  padding:10px 12px;text-align:left;font-size:.72rem;font-weight:600;
  letter-spacing:.08em;text-transform:uppercase;color:{T_HDR_CLR};
  position:sticky;top:0;z-index:10;background:{T_HDR_BG};
  border-bottom:1px solid {T_BD};backdrop-filter:blur(8px)
}}
th.cg{{width:54px;text-align:center}}
tr{{border-bottom:1px solid {T_BD};transition:background .15s}}
tr:hover{{background:{T_HOVER}!important}}
td{{padding:10px 12px;vertical-align:top;line-height:1.6;word-break:break-word;white-space:normal}}
.cg{{text-align:center;vertical-align:middle;width:54px}}
.ca{{color:{T_DE};font-weight:600;font-size:1rem;min-width:130px}}
.cb{{color:{T_EX};font-style:italic;font-size:.92rem;min-width:150px}}
.cc{{color:{T_DE};font-size:.95rem;min-width:110px}}
.cd{{color:{T_EX};font-style:italic;font-size:.92rem;min-width:130px}}
.ce{{color:{T_HI};font-family:'Noto Sans Devanagari',sans-serif;font-size:.95rem;min-width:100px}}
.cf{{color:{T_EX};font-family:'Noto Sans Devanagari',sans-serif;font-style:italic;font-size:.88rem;min-width:130px}}
.play-btn{{
  display:inline-flex;align-items:center;justify-content:center;
  width:38px;height:38px;border:none;border-radius:50%;
  background:{BTN_BG};color:{BTN_CLR};cursor:pointer;
  transition:background .18s,transform .12s;outline:none
}}
.play-btn:hover{{background:{BTN_HOV};transform:scale(1.12)}}
.play-btn:active{{transform:scale(.96)}}
.play-btn.playing{{background:{BTN_ACT};color:{BTN_ACT_C};animation:pulse 1.2s infinite}}
@keyframes pulse{{0%,100%{{box-shadow:0 0 0 0 {BTN_ACT}80}}50%{{box-shadow:0 0 0 7px {BTN_ACT}00}}}}
.no-aud{{color:{T_EX};font-size:1.1rem}}
audio{{display:none}}
</style></head><body>
<table>
<thead><tr>
  <th class="cg">▶</th>
  <th>🇩🇪 Word / Verb</th><th>Example (German)</th>
  <th>🇬🇧 English</th><th>Example (English)</th>
  <th>🇮🇳 Hindi</th><th>Example (Hindi)</th>
</tr></thead>
<tbody>{"".join(rows_html)}</tbody>
</table>
<script>
var cB=null,cA=null;
function playRow(id){{
  var btn=event.currentTarget,aud=document.getElementById('a'+id);
  if(!aud)return;
  if(cA===aud){{aud.paused?(aud.play(),btn.classList.add('playing')):(aud.pause(),btn.classList.remove('playing'));return}}
  if(cA){{cA.pause();cA.currentTime=0}}
  if(cB)cB.classList.remove('playing');
  cA=aud;cB=btn;btn.classList.add('playing');
  aud.play().catch(e=>console.warn(e));
  aud.onended=()=>{{btn.classList.remove('playing');cA=null;cB=null}}
}}
</script></body></html>"""

components.html(html, height=table_h, scrolling=True)

# ── Footer pagination ─────────────────────────────────────────────────────────
if total_pages > 1:
    st.divider()
    f1, f2, f3 = st.columns([1,2,1])
    with f1:
        if st.button("◀ Prev", key="prev2", disabled=(page==1), use_container_width=True):
            st.session_state.cur_page = page-1; st.rerun()
    with f2:
        st.markdown(f"<div style='text-align:center;color:{TEXT2};padding-top:10px'>Page {page} / {total_pages}</div>",
                    unsafe_allow_html=True)
    with f3:
        if st.button("Next ▶", key="next2", disabled=(page==total_pages), use_container_width=True):
            st.session_state.cur_page = page+1; st.rerun()

st.markdown(f"<div style='text-align:center;color:{TEXT2};font-size:.75rem;padding:12px 0'>🇩🇪 German Vocabulary Studio</div>",
            unsafe_allow_html=True)

# ── NEW: Quiz Mode ────────────────────────────────────────────────────────────
if st.session_state.quiz_mode:
    # Quiz header
    c1, c2, c3 = st.columns([1, 2, 1])
    with c1:
        if st.button("🏠 Home", key="quiz_home", help="Back to vocabulary list"):
            st.session_state.quiz_mode = False
            st.rerun()
    with c2:
        st.markdown(f"<div style='text-align:center;color:{TEXT2};padding-top:8px'>Quiz Mode</div>", unsafe_allow_html=True)
    with c3:
        st.markdown(f"<div style='text-align:right;color:{ACCENT};padding-top:8px;font-weight:600'>{st.session_state.quiz_score}/{st.session_state.quiz_idx}</div>", unsafe_allow_html=True)
    
    st.divider()
    
    # Get current word
    if st.session_state.quiz_idx < len(df_view):
        oi = orig_indices[st.session_state.quiz_idx]
        row = df.loc[oi]
        current_word = str(row.get(col_de, "")).strip()
        correct_answer = str(row.get(col_en, "")).strip()
        
        # Quiz container
        st.markdown(f"<div class='quiz-container' style='background:{CARD};border:1px solid {CARD_BD};border-radius:14px;padding:16px'>", unsafe_allow_html=True)
        
        # Progress bar
        progress = (st.session_state.quiz_idx + 1) / len(df_view)
        st.markdown(f"<div class='quiz-progress'><div class='quiz-progress-bar' style='width:{progress*100}%'></div></div>", unsafe_allow_html=True)
        
        # Question
        st.markdown(f"<div style='text-align:center;margin:12px 0'><p style='color:{TEXT2};font-size:.85rem;margin:0'>Word {st.session_state.quiz_idx + 1} of {len(df_view)}</p><h2 style='color:{TEXT};margin:8px 0;font-size:1.8rem'>{current_word}</h2></div>", unsafe_allow_html=True)
        
        # Voice options (3 buttons in ONE TRUE HORIZONTAL LINE)
        if oi in page_b64:
            audio_data = page_b64[oi]
            voice_html = f"""
            <div style="display:flex;gap:8px;justify-content:center;align-items:center;margin:12px 0;flex-wrap:nowrap;width:100%;">
                <button id="btn_play_{oi}" onclick="document.getElementById('audio_{oi}').play()" style="flex:1;min-width:0;padding:8px 6px;font-size:.7rem;border:none;border-radius:8px;background:{BTN_BG};color:{BTN_CLR};cursor:pointer;font-weight:500;transition:all .2s;white-space:nowrap;">🔊 Listen</button>
                <button id="btn_slow_{oi}" onclick="document.getElementById('audio_{oi}').playbackRate=0.75;document.getElementById('audio_{oi}').play()" style="flex:1;min-width:0;padding:8px 6px;font-size:.7rem;border:none;border-radius:8px;background:{BTN_BG};color:{BTN_CLR};cursor:pointer;font-weight:500;transition:all .2s;white-space:nowrap;">🐢 Slow</button>
                <button id="btn_repeat_{oi}" onclick="document.getElementById('audio_{oi}').currentTime=0;document.getElementById('audio_{oi}').play()" style="flex:1;min-width:0;padding:8px 6px;font-size:.7rem;border:none;border-radius:8px;background:{BTN_BG};color:{BTN_CLR};cursor:pointer;font-weight:500;transition:all .2s;white-space:nowrap;">🔁 Repeat</button>
            </div>
            <audio id="audio_{oi}" style="display:none;">
                <source src="data:audio/mpeg;base64,{audio_data}" type="audio/mpeg">
            </audio>
            """
            st.markdown(voice_html, unsafe_allow_html=True)
        else:
            st.markdown(f"<div style='text-align:center;color:{TEXT2};padding:8px'>No audio available</div>", unsafe_allow_html=True)
        
        # Answer options (4 options in 2x2 grid)
        # Generate 3 random wrong answers + 1 correct
        import random
        all_english = df[col_en].dropna().unique().tolist()
        wrong_answers = [a for a in all_english if a != correct_answer]
        random.shuffle(wrong_answers)
        wrong_answers = wrong_answers[:3]
        answer_options = [correct_answer] + wrong_answers
        random.shuffle(answer_options)
        
        st.markdown(f"<div class='answer-grid'>", unsafe_allow_html=True)
        
        answer_cols = st.columns(2, gap="small")
        for idx, option in enumerate(answer_options):
            with answer_cols[idx % 2]:
                is_correct = option == correct_answer
                btn_key = f"ans_{oi}_{idx}"
                if st.button(option, key=btn_key, use_container_width=True, 
                            help="Select this answer"):
                    if is_correct:
                        st.session_state.quiz_score += 1
                        st.toast("✅ Correct!", icon="🎉")
                    else:
                        st.toast(f"❌ Wrong! Answer: {correct_answer}", icon="😢")
                    st.session_state.quiz_idx += 1
                    st.rerun()
        
        st.markdown("</div>", unsafe_allow_html=True)
        
        # Navigation footer
        st.markdown(f"<div class='nav-footer'>", unsafe_allow_html=True)
        nav_c1, nav_c2, nav_c3 = st.columns([1, 1, 1])
        
        with nav_c1:
            pass
        with nav_c2:
            if st.button("⏭️ Skip", key="skip_q", use_container_width=True, help="Skip this word"):
                st.session_state.quiz_idx += 1
                st.rerun()
        with nav_c3:
            if st.button("Next ▶", key="next_q", use_container_width=True, help="Next question"):
                st.session_state.quiz_idx += 1
                st.rerun()
        
        st.markdown("</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)
    
    else:
        # Quiz complete
        st.markdown(f"<div style='text-align:center;padding:40px 20px'><h2 style='color:{ACCENT};margin:20px 0'>🎉 Quiz Complete!</h2><h3 style='color:{TEXT};margin:12px 0'>Score: {st.session_state.quiz_score}/{len(df_view)}</h3></div>", unsafe_allow_html=True)
        if st.button("🔄 Restart Quiz", use_container_width=True):
            st.session_state.quiz_idx = 0
            st.session_state.quiz_score = 0
            st.rerun()
        if st.button("🏠 Back to Vocabulary", use_container_width=True):
            st.session_state.quiz_mode = False
            st.rerun()
    
    st.stop()

# ── Add Quiz Mode Button ──────────────────────────────────────────────────────
st.divider()
quiz_col, _ = st.columns([1, 4])
with quiz_col:
    if st.button("📝 Start Quiz Mode", use_container_width=True, help="Practice with interactive quiz"):
        st.session_state.quiz_mode = True
        st.session_state.quiz_idx = 0
        st.session_state.quiz_score = 0
        st.rerun()

st.divider()

# ── Search results table (same as before) ─────────────────────────────────────
# ...existing table display code (search, pagination, table rendering)...
