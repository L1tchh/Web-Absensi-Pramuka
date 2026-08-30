import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Shield, Users, CalendarDays, ClipboardCheck, LogOut, Plus, Trash2,
  Pencil, KeyRound, Compass, TrendingUp, TrendingDown, Award,
  CheckCircle2, XCircle, Clock3, ChevronRight, Save, X, Minus,
  Settings, Download, Printer, Bell, Lock,
} from "lucide-react";


const STORAGE_KEY = "pramuka-absensi-data";

const SEED_TRAINING_TYPES = [
  { id: "tt-1", name: "Tali Temali" },
  { id: "tt-2", name: "PBB (Baris-Berbaris)" },
  { id: "tt-3", name: "Sansemo" },
  { id: "tt-4", name: "Pionering" },
];

const STATUS = {
  HADIR: "hadir",
  IZIN: "izin",
  ALPA: "alpa",
};

const uid = (p = "id") => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function genTagCode(existing) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (existing.includes(code));
  return code;
}

function defaultData() {
  return {
    adminPassword: "admin123",
    members: [],
    trainingTypes: SEED_TRAINING_TYPES,
    schedules: [],
    attendance: [], // { id, scheduleId, memberId, status, skillScore }
  };
}

function fmtDate(d) {
  if (!d) return "-";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return d;
  }
}

function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function daysUntil(dateStr) {
  const today = new Date(todayStr() + "T00:00:00");
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function getNextSchedule(schedules) {
  const today = todayStr();
  return [...schedules]
    .filter((s) => s.date >= today)
    .sort((a, b) => (a.date > b.date ? 1 : -1))[0] || null;
}

function reminderText(days) {
  if (days === 0) return "Hari ini!";
  if (days === 1) return "Besok";
  return `${days} hari lagi`;
}


const COLORS = {
  bg: "#EEE7D3",
  paper: "#FAF7EC",
  ink: "#28331F",
  forest: "#31402A",
  olive: "#6C7B49",
  leather: "#8A5A32",
  gold: "#C89A3B",
  red: "#A6403F",
  green: "#4C7A3D",
  line: "#D9CFAF",
};

function ThemeStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
      .pr-root { font-family: 'Work Sans', sans-serif; color: ${COLORS.ink}; background: ${COLORS.bg}; }
      .pr-display { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.04em; }
      .pr-mono { font-family: 'IBM Plex Mono', monospace; }
      .pr-card { background: ${COLORS.paper}; border: 1px solid ${COLORS.line}; }
      .pr-badge-ring { position: relative; display:flex; align-items:center; justify-content:center; border-radius:9999px; }
      .pr-badge-ring::before {
        content:""; position:absolute; inset:-6px; border-radius:9999px;
        border: 2px dashed ${COLORS.gold}; opacity:0.55;
      }
      .pr-ribbon { clip-path: polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%); }
      .pr-btn { transition: transform .12s ease, filter .12s ease; }
      .pr-btn:hover { filter: brightness(0.95); transform: translateY(-1px); }
      .pr-input:focus { outline: 2px solid ${COLORS.olive}; outline-offset: 1px; }
      .pr-tab-active { border-bottom: 3px solid ${COLORS.gold}; color: ${COLORS.forest}; }
    `}</style>
  );
}

function BadgeRing({ pct, size = 88, thickness = 8, label, sub }) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const bg = `conic-gradient(${COLORS.gold} ${clamped * 3.6}deg, #00000014 0deg)`;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="pr-badge-ring" style={{ width: size, height: size, background: bg, padding: thickness }}>
        <div
          className="rounded-full flex flex-col items-center justify-center"
          style={{ width: size - thickness * 2, height: size - thickness * 2, background: COLORS.paper }}
        >
          <span className="pr-mono font-semibold" style={{ fontSize: size * 0.24, color: COLORS.forest }}>{clamped}%</span>
        </div>
      </div>
      {label && <span className="text-xs font-semibold text-center" style={{ color: COLORS.ink }}>{label}</span>}
      {sub && <span className="text-[11px] text-center opacity-70">{sub}</span>}
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    [STATUS.HADIR]: { label: "Hadir", color: COLORS.green, Icon: CheckCircle2 },
    [STATUS.IZIN]: { label: "Izin", color: COLORS.gold, Icon: Clock3 },
    [STATUS.ALPA]: { label: "Alpa", color: COLORS.red, Icon: XCircle },
  };
  const m = map[status] || map[STATUS.ALPA];
  const I = m.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: `${m.color}22`, color: m.color }}
    >
      <I size={13} /> {m.label}
    </span>
  );
}

function NextScheduleReminder({ schedules, trainingTypes }) {
  const next = getNextSchedule(schedules);
  if (!next) return null;
  const tt = trainingTypes.find((t) => t.id === next.trainingTypeId);
  const days = daysUntil(next.date);
  const urgent = days <= 1;
  return (
    <div
      className="pr-card rounded-xl p-4 flex items-center gap-3"
      style={{ borderLeft: `4px solid ${urgent ? COLORS.red : COLORS.gold}` }}
    >
      <div className="rounded-full p-2" style={{ background: urgent ? `${COLORS.red}22` : `${COLORS.gold}22` }}>
        <Bell size={18} style={{ color: urgent ? COLORS.red : COLORS.gold }} />
      </div>
      <div className="flex-1">
        <p className="text-xs opacity-60">Latihan berikutnya</p>
        <p className="text-sm font-semibold">{tt?.name || "Latihan"} — {fmtDate(next.date)}{next.note ? ` · ${next.note}` : ""}</p>
      </div>
      <span
        className="pr-mono text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap"
        style={{ background: urgent ? `${COLORS.red}22` : `${COLORS.gold}22`, color: urgent ? COLORS.red : COLORS.leather }}
      >
        {reminderText(days)}
      </span>
    </div>
  );
}


function buildMemberSummary(data, member) {
  const records = data.attendance
    .filter((a) => a.memberId === member.id)
    .map((r) => ({ ...r, schedule: data.schedules.find((s) => s.id === r.scheduleId) }))
    .filter((r) => r.schedule)
    .sort((a, b) => (a.schedule.date > b.schedule.date ? 1 : -1));
  const hadir = records.filter((r) => r.status === STATUS.HADIR).length;
  const izin = records.filter((r) => r.status === STATUS.IZIN).length;
  const alpa = records.filter((r) => r.status === STATUS.ALPA).length;
  const total = records.length;
  const overallPct = total ? Math.round((hadir / total) * 100) : 0;
  return { records, hadir, izin, alpa, total, overallPct };
}

function exportAllToExcel(data) {
  const wb = XLSX.utils.book_new();

  const pesertaSheet = data.members.map((m) => {
    const s = buildMemberSummary(data, m);
    return {
      Nama: m.name,
      "Tag Code": m.tagCode,
      Hadir: s.hadir,
      Izin: s.izin,
      Alpa: s.alpa,
      "Total Sesi": s.total,
      "Persentase Kehadiran (%)": s.overallPct,
    };
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pesertaSheet), "Ringkasan Peserta");

  const jadwalSheet = [...data.schedules]
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .map((s) => ({
      Tanggal: fmtDate(s.date),
      "Jenis Latihan": data.trainingTypes.find((t) => t.id === s.trainingTypeId)?.name || "-",
      Catatan: s.note || "",
    }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(jadwalSheet), "Jadwal");

  const absensiSheet = data.attendance
    .map((a) => {
      const m = data.members.find((x) => x.id === a.memberId);
      const s = data.schedules.find((x) => x.id === a.scheduleId);
      if (!m || !s) return null;
      return {
        Tanggal: fmtDate(s.date),
        "Jenis Latihan": data.trainingTypes.find((t) => t.id === s.trainingTypeId)?.name || "-",
        Nama: m.name,
        Status: a.status,
        "Skor Skill": a.skillScore ?? "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.Tanggal < b.Tanggal ? 1 : -1));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(absensiSheet), "Detail Absensi");

  XLSX.writeFile(wb, `laporan-absensi-pramuka-${todayStr()}.xlsx`);
}

function exportMemberToExcel(data, member) {
  const s = buildMemberSummary(data, member);
  const wb = XLSX.utils.book_new();
  const ringkasan = [{
    Nama: member.name, "Tag Code": member.tagCode, Hadir: s.hadir, Izin: s.izin, Alpa: s.alpa,
    "Total Sesi": s.total, "Persentase Kehadiran (%)": s.overallPct,
  }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ringkasan), "Ringkasan");

  const riwayat = s.records.map((r) => ({
    Tanggal: fmtDate(r.schedule.date),
    "Jenis Latihan": data.trainingTypes.find((t) => t.id === r.schedule.trainingTypeId)?.name || "-",
    Status: r.status,
    "Skor Skill": r.skillScore ?? "",
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(riwayat), "Riwayat");

  XLSX.writeFile(wb, `laporan-${member.name.replace(/\s+/g, "-")}-${todayStr()}.xlsx`);
}

function printHtmlReport(title, bodyHtml) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #24301F; padding: 24px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          p.sub { color: #666; margin-top: 0; margin-bottom: 20px; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; text-align: left; }
          th { background: #EEE7D3; }
          h2 { font-size: 14px; margin-top: 28px; border-bottom: 2px solid #C89A3B; padding-bottom: 4px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <p class="sub">Dicetak pada ${fmtDate(todayStr())}</p>
        ${bodyHtml}
        <script>window.onload = () => setTimeout(() => window.print(), 200);</script>
      </body>
    </html>
  `);
  win.document.close();
}

function printAllReport(data) {
  const rows = data.members.map((m) => {
    const s = buildMemberSummary(data, m);
    return `<tr><td>${m.name}</td><td>${s.hadir}</td><td>${s.izin}</td><td>${s.alpa}</td><td>${s.total}</td><td>${s.overallPct}%</td></tr>`;
  }).join("");
  const body = `
    <h2>Ringkasan Kehadiran Seluruh Anggota</h2>
    <table>
      <tr><th>Nama</th><th>Hadir</th><th>Izin</th><th>Alpa</th><th>Total Sesi</th><th>% Kehadiran</th></tr>
      ${rows || '<tr><td colspan="6">Belum ada data.</td></tr>'}
    </table>
  `;
  printHtmlReport("Laporan Absensi Latihan Pramuka", body);
}

function printMemberReport(data, member) {
  const s = buildMemberSummary(data, member);
  const rows = s.records.map((r) => {
    const tt = data.trainingTypes.find((t) => t.id === r.schedule.trainingTypeId);
    return `<tr><td>${fmtDate(r.schedule.date)}</td><td>${tt?.name || "-"}</td><td>${r.status}</td><td>${r.skillScore ?? "-"}</td></tr>`;
  }).join("");
  const body = `
    <h2>Ringkasan</h2>
    <table>
      <tr><th>Hadir</th><th>Izin</th><th>Alpa</th><th>Total Sesi</th><th>% Kehadiran</th></tr>
      <tr><td>${s.hadir}</td><td>${s.izin}</td><td>${s.alpa}</td><td>${s.total}</td><td>${s.overallPct}%</td></tr>
    </table>
    <h2>Riwayat Latihan</h2>
    <table>
      <tr><th>Tanggal</th><th>Latihan</th><th>Status</th><th>Skor</th></tr>
      ${rows || '<tr><td colspan="4">Belum ada riwayat.</td></tr>'}
    </table>
  `;
  printHtmlReport(`Laporan Latihan — ${member.name}`, body);
}


export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState("");
  const [view, setView] = useState("login"); // login | admin | member
  const [currentMemberId, setCurrentMemberId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY, true);
        if (res && res.value) {
          setData(JSON.parse(res.value));
        } else {
          const d = defaultData();
          setData(d);
          await window.storage.set(STORAGE_KEY, JSON.stringify(d), true);
        }
      } catch (e) {
        const d = defaultData();
        setData(d);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(next) {
    setData(next);
    try {
      const res = await window.storage.set(STORAGE_KEY, JSON.stringify(next), true);
      if (!res) setSaveError("Gagal menyimpan data. Coba lagi.");
      else setSaveError("");
    } catch {
      setSaveError("Gagal menyimpan data. Periksa koneksi lalu coba lagi.");
    }
  }

  function handleLogout() {
    setView("login");
    setCurrentMemberId(null);
  }

  if (loading) {
    return (
      <div className="pr-root min-h-[500px] flex items-center justify-center p-10">
        <ThemeStyles />
        <div className="flex flex-col items-center gap-3">
          <Compass className="animate-spin" size={32} style={{ color: COLORS.olive }} />
          <p className="pr-mono text-sm opacity-70">Memuat data regu…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pr-root min-h-[600px] w-full rounded-xl overflow-hidden" style={{ border: `1px solid ${COLORS.line}` }}>
      <ThemeStyles />
      {saveError && (
        <div className="text-xs px-4 py-2" style={{ background: `${COLORS.red}22`, color: COLORS.red }}>{saveError}</div>
      )}
      {view === "login" && (
        <LoginScreen
          data={data}
          onAdminLogin={() => setView("admin")}
          onMemberLogin={(id) => { setCurrentMemberId(id); setView("member"); }}
        />
      )}
      {view === "admin" && (
        <AdminApp data={data} persist={persist} onLogout={handleLogout} />
      )}
      {view === "member" && (
        <MemberApp data={data} memberId={currentMemberId} onLogout={handleLogout} />
      )}
    </div>
  );
}



function LoginScreen({ data, onAdminLogin, onMemberLogin }) {
  const [mode, setMode] = useState(null); // 'admin' | 'member'
  const [password, setPassword] = useState("");
  const [tagCode, setTagCode] = useState("");
  const [error, setError] = useState("");

  function submitAdmin() {
    if (password === data.adminPassword) {
      onAdminLogin();
    } else {
      setError("Kata sandi admin salah.");
    }
  }

  function submitMember() {
    const code = tagCode.trim().toUpperCase();
    const found = data.members.find((m) => m.tagCode === code);
    if (found) {
      onMemberLogin(found.id);
    } else {
      setError("Tag code tidak ditemukan. Cek kembali kode yang diberikan pembina.");
    }
  }

  return (
    <div className="min-h-[600px] flex flex-col items-center justify-center px-6 py-14" style={{ background: `radial-gradient(circle at 50% 0%, ${COLORS.paper}, ${COLORS.bg})` }}>
      <div className="flex items-center gap-2 mb-2">
        <Compass size={30} style={{ color: COLORS.forest }} />
        <h1 className="pr-display text-4xl" style={{ color: COLORS.forest }}>ABSENSI LATIHAN PRAMUKA</h1>
      </div>
      <p className="text-sm opacity-70 mb-8">Presensi, jadwal, dan perkembangan skill anggota regu</p>

      {!mode && (
        <div className="grid sm:grid-cols-2 gap-4 w-full max-w-md">
          <button
            onClick={() => { setMode("admin"); setError(""); }}
            className="pr-btn pr-card rounded-2xl p-6 flex flex-col items-center gap-2 shadow-sm"
          >
            <Shield size={28} style={{ color: COLORS.leather }} />
            <span className="font-semibold">Login Pembina</span>
            <span className="text-xs opacity-60 text-center">Kelola jadwal, peserta & absensi</span>
          </button>
          <button
            onClick={() => { setMode("member"); setError(""); }}
            className="pr-btn pr-card rounded-2xl p-6 flex flex-col items-center gap-2 shadow-sm"
          >
            <Award size={28} style={{ color: COLORS.gold }} />
            <span className="font-semibold">Login Anggota</span>
            <span className="text-xs opacity-60 text-center">Masuk pakai tag code kamu</span>
          </button>
        </div>
      )}

      {mode === "admin" && (
        <div className="pr-card rounded-2xl p-6 w-full max-w-sm flex flex-col gap-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} style={{ color: COLORS.leather }} />
            <h2 className="font-semibold">Login Pembina</h2>
          </div>
          <label className="text-xs font-semibold opacity-70">Kata sandi</label>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitAdmin(); }}
            className="pr-input rounded-lg px-3 py-2 border"
            style={{ borderColor: COLORS.line }}
            placeholder="Kata sandi admin"
          />
          {error && <p className="text-xs" style={{ color: COLORS.red }}>{error}</p>}
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setMode(null)} className="pr-btn flex-1 rounded-lg py-2 text-sm font-semibold border" style={{ borderColor: COLORS.line }}>Kembali</button>
            <button type="button" onClick={submitAdmin} className="pr-btn flex-1 rounded-lg py-2 text-sm font-semibold text-white" style={{ background: COLORS.forest }}>Masuk</button>
          </div>
          <p className="text-[11px] opacity-50 mt-1">Kata sandi awal: admin123</p>
        </div>
      )}

      {mode === "member" && (
        <div className="pr-card rounded-2xl p-6 w-full max-w-sm flex flex-col gap-3 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Award size={18} style={{ color: COLORS.gold }} />
            <h2 className="font-semibold">Login Anggota</h2>
          </div>
          <label className="text-xs font-semibold opacity-70">Tag code</label>
          <input
            autoFocus
            value={tagCode}
            onChange={(e) => setTagCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") submitMember(); }}
            className="pr-input pr-mono rounded-lg px-3 py-2 border tracking-widest"
            style={{ borderColor: COLORS.line }}
            placeholder="CONTOH: 7QK3XZ"
            maxLength={6}
          />
          {error && <p className="text-xs" style={{ color: COLORS.red }}>{error}</p>}
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={() => setMode(null)} className="pr-btn flex-1 rounded-lg py-2 text-sm font-semibold border" style={{ borderColor: COLORS.line }}>Kembali</button>
            <button type="button" onClick={submitMember} className="pr-btn flex-1 rounded-lg py-2 text-sm font-semibold text-white" style={{ background: COLORS.forest }}>Masuk</button>
          </div>
        </div>
      )}
    </div>
  );
}


function AdminApp({ data, persist, onLogout }) {
  const [tab, setTab] = useState("dashboard");
  const tabs = [
    { id: "dashboard", label: "Ringkasan", Icon: Compass },
    { id: "peserta", label: "Peserta", Icon: Users },
    { id: "latihan", label: "Jenis Latihan", Icon: Award },
    { id: "jadwal", label: "Jadwal", Icon: CalendarDays },
    { id: "absensi", label: "Ambil Absensi", Icon: ClipboardCheck },
    { id: "pengaturan", label: "Pengaturan", Icon: Settings },
  ];

  return (
    <div className="min-h-[600px] flex flex-col">
      <header className="flex items-center justify-between px-5 py-4" style={{ background: COLORS.forest }}>
        <div className="flex items-center gap-2 text-white">
          <Shield size={20} />
          <span className="pr-display text-2xl">PANEL PEMBINA</span>
        </div>
        <button onClick={onLogout} className="pr-btn flex items-center gap-1 text-white text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#ffffff22" }}>
          <LogOut size={15} /> Keluar
        </button>
      </header>

      <nav className="flex overflow-x-auto gap-1 px-3 pt-3" style={{ background: COLORS.paper, borderBottom: `1px solid ${COLORS.line}` }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`pr-btn flex items-center gap-1.5 px-3 py-2 text-sm font-semibold whitespace-nowrap ${tab === t.id ? "pr-tab-active" : "opacity-60"}`}
          >
            <t.Icon size={15} /> {t.label}
          </button>
        ))}
      </nav>

      <div className="p-5 flex-1" style={{ background: COLORS.bg }}>
        {tab === "dashboard" && <AdminDashboardTab data={data} />}
        {tab === "peserta" && <PesertaTab data={data} persist={persist} />}
        {tab === "latihan" && <LatihanTab data={data} persist={persist} />}
        {tab === "jadwal" && <JadwalTab data={data} persist={persist} />}
        {tab === "absensi" && <AbsensiTab data={data} persist={persist} />}
        {tab === "pengaturan" && <PengaturanTab data={data} persist={persist} />}
      </div>
    </div>
  );
}

function AdminDashboardTab({ data }) {
  const totalMembers = data.members.length;
  const totalSchedules = data.schedules.length;
  const totalRecords = data.attendance.length;
  const hadirCount = data.attendance.filter((a) => a.status === STATUS.HADIR).length;
  const overallPct = totalRecords ? Math.round((hadirCount / totalRecords) * 100) : 0;

  const cards = [
    { label: "Total Anggota", value: totalMembers, Icon: Users, color: COLORS.forest },
    { label: "Total Jadwal", value: totalSchedules, Icon: CalendarDays, color: COLORS.leather },
    { label: "Jenis Latihan", value: data.trainingTypes.length, Icon: Award, color: COLORS.gold },
  ];

  return (
    <div className="flex flex-col gap-5">
      <NextScheduleReminder schedules={data.schedules} trainingTypes={data.trainingTypes} />

      <div className="grid sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="pr-card rounded-xl p-4 flex items-center gap-3">
            <div className="rounded-full p-2.5" style={{ background: `${c.color}22` }}>
              <c.Icon size={20} style={{ color: c.color }} />
            </div>
            <div>
              <p className="text-2xl font-bold pr-mono">{c.value}</p>
              <p className="text-xs opacity-60">{c.label}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="pr-card rounded-xl p-5 flex flex-wrap items-center gap-6 justify-between">
        <div className="flex items-center gap-6">
          <BadgeRing pct={overallPct} label="Kehadiran Keseluruhan" sub={`${hadirCount}/${totalRecords} sesi tercatat`} size={100} />
          <div className="text-sm opacity-70 max-w-sm">
            Persentase ini dihitung dari seluruh catatan absensi yang sudah diambil pembina di semua jadwal latihan.
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={() => exportAllToExcel(data)} className="pr-btn flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: COLORS.forest }}>
            <Download size={15} /> Unduh Laporan Excel
          </button>
          <button onClick={() => printAllReport(data)} className="pr-btn flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border" style={{ borderColor: COLORS.line }}>
            <Printer size={15} /> Cetak / Simpan PDF
          </button>
        </div>
      </div>
      {totalMembers === 0 && (
        <p className="text-sm opacity-60">Belum ada peserta. Tambahkan anggota di tab <b>Peserta</b> untuk mulai mencatat absensi.</p>
      )}
    </div>
  );
}

function PengaturanTab({ data, persist }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState({ type: "", text: "" });

  function submit() {
    if (current !== data.adminPassword) {
      setMsg({ type: "error", text: "Kata sandi saat ini salah." });
      return;
    }
    if (next.length < 4) {
      setMsg({ type: "error", text: "Kata sandi baru minimal 4 karakter." });
      return;
    }
    if (next !== confirm) {
      setMsg({ type: "error", text: "Konfirmasi kata sandi tidak cocok." });
      return;
    }
    persist({ ...data, adminPassword: next });
    setMsg({ type: "success", text: "Kata sandi berhasil diubah." });
    setCurrent(""); setNext(""); setConfirm("");
  }

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <div className="pr-card rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={16} style={{ color: COLORS.leather }} />
          <h3 className="font-semibold">Ubah Kata Sandi Admin</h3>
        </div>
        <label className="text-xs font-semibold opacity-70">Kata sandi saat ini</label>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="pr-input rounded-lg px-3 py-2 border" style={{ borderColor: COLORS.line }} />
        <label className="text-xs font-semibold opacity-70">Kata sandi baru</label>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="pr-input rounded-lg px-3 py-2 border" style={{ borderColor: COLORS.line }} />
        <label className="text-xs font-semibold opacity-70">Konfirmasi kata sandi baru</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} className="pr-input rounded-lg px-3 py-2 border" style={{ borderColor: COLORS.line }} />
        {msg.text && (
          <p className="text-xs" style={{ color: msg.type === "error" ? COLORS.red : COLORS.green }}>{msg.text}</p>
        )}
        <button type="button" onClick={submit} className="pr-btn rounded-lg py-2 text-sm font-semibold text-white mt-1" style={{ background: COLORS.forest }}>
          Simpan Kata Sandi
        </button>
      </div>
    </div>
  );
}

function PesertaTab({ data, persist }) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  function addMember() {
    if (!name.trim()) return;
    const tagCode = genTagCode(data.members.map((m) => m.tagCode));
    const newMember = { id: uid("mbr"), name: name.trim(), tagCode };
    persist({ ...data, members: [...data.members, newMember] });
    setName("");
  }

  function removeMember(id) {
    persist({
      ...data,
      members: data.members.filter((m) => m.id !== id),
      attendance: data.attendance.filter((a) => a.memberId !== id),
    });
  }

  function saveEdit(id) {
    persist({ ...data, members: data.members.map((m) => (m.id === id ? { ...m, name: editName.trim() || m.name } : m)) });
    setEditingId(null);
  }

  function regenerateCode(id) {
    const tagCode = genTagCode(data.members.map((m) => m.tagCode));
    persist({ ...data, members: data.members.map((m) => (m.id === id ? { ...m, tagCode } : m)) });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="pr-card rounded-xl p-4 flex gap-2 flex-wrap items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold opacity-70">Nama peserta baru</label>
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addMember(); }} className="pr-input rounded-lg px-3 py-2 border" style={{ borderColor: COLORS.line }} placeholder="cth. Ahmad Fauzan" />
        </div>
        <button type="button" onClick={addMember} className="pr-btn flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: COLORS.forest }}>
          <Plus size={15} /> Tambah & Buat Tag Code
        </button>
      </div>

      <div className="pr-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background: COLORS.bg }}>
            <tr className="text-left">
              <th className="p-3">Nama</th>
              <th className="p-3">Tag Code</th>
              <th className="p-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => (
              <tr key={m.id} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                <td className="p-3">
                  {editingId === m.id ? (
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className="pr-input rounded-lg px-2 py-1 border w-full" style={{ borderColor: COLORS.line }} />
                  ) : (
                    <span className="font-medium">{m.name}</span>
                  )}
                </td>
                <td className="p-3">
                  <span className="pr-mono px-2 py-1 rounded-md text-xs font-semibold" style={{ background: `${COLORS.gold}22`, color: COLORS.leather }}>{m.tagCode}</span>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    {editingId === m.id ? (
                      <button onClick={() => saveEdit(m.id)} className="pr-btn p-1.5 rounded-md" style={{ background: `${COLORS.green}22` }}><Save size={14} style={{ color: COLORS.green }} /></button>
                    ) : (
                      <button onClick={() => { setEditingId(m.id); setEditName(m.name); }} className="pr-btn p-1.5 rounded-md" style={{ background: COLORS.bg }}><Pencil size={14} /></button>
                    )}
                    <button onClick={() => regenerateCode(m.id)} title="Buat ulang tag code" className="pr-btn p-1.5 rounded-md" style={{ background: COLORS.bg }}><KeyRound size={14} /></button>
                    <button onClick={() => removeMember(m.id)} className="pr-btn p-1.5 rounded-md" style={{ background: `${COLORS.red}22` }}><Trash2 size={14} style={{ color: COLORS.red }} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {data.members.length === 0 && (
              <tr><td colSpan={3} className="p-4 text-center text-sm opacity-50">Belum ada peserta.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LatihanTab({ data, persist }) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  function add() {
    if (!name.trim()) return;
    persist({ ...data, trainingTypes: [...data.trainingTypes, { id: uid("tt"), name: name.trim() }] });
    setName("");
  }

  function remove(id) {
    persist({
      ...data,
      trainingTypes: data.trainingTypes.filter((t) => t.id !== id),
      schedules: data.schedules.filter((s) => s.trainingTypeId !== id),
    });
  }

  function saveEdit(id) {
    persist({ ...data, trainingTypes: data.trainingTypes.map((t) => (t.id === id ? { ...t, name: editName.trim() || t.name } : t)) });
    setEditingId(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="pr-card rounded-xl p-4 flex gap-2 flex-wrap items-end">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs font-semibold opacity-70">Nama jenis latihan / skill</label>
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} className="pr-input rounded-lg px-3 py-2 border" style={{ borderColor: COLORS.line }} placeholder="cth. Navigasi Darat" />
        </div>
        <button type="button" onClick={add} className="pr-btn flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: COLORS.forest }}>
          <Plus size={15} /> Tambah
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.trainingTypes.map((t) => (
          <div key={t.id} className="pr-card rounded-xl p-4 flex items-center justify-between gap-2">
            {editingId === t.id ? (
              <input value={editName} onChange={(e) => setEditName(e.target.value)} className="pr-input rounded-lg px-2 py-1 border flex-1" style={{ borderColor: COLORS.line }} />
            ) : (
              <div className="flex items-center gap-2">
                <Award size={16} style={{ color: COLORS.gold }} />
                <span className="font-semibold text-sm">{t.name}</span>
              </div>
            )}
            <div className="flex gap-1">
              {editingId === t.id ? (
                <button onClick={() => saveEdit(t.id)} className="pr-btn p-1.5 rounded-md" style={{ background: `${COLORS.green}22` }}><Save size={14} style={{ color: COLORS.green }} /></button>
              ) : (
                <button onClick={() => { setEditingId(t.id); setEditName(t.name); }} className="pr-btn p-1.5 rounded-md" style={{ background: COLORS.bg }}><Pencil size={14} /></button>
              )}
              <button onClick={() => remove(t.id)} className="pr-btn p-1.5 rounded-md" style={{ background: `${COLORS.red}22` }}><Trash2 size={14} style={{ color: COLORS.red }} /></button>
            </div>
          </div>
        ))}
        {data.trainingTypes.length === 0 && <p className="text-sm opacity-50">Belum ada jenis latihan.</p>}
      </div>
    </div>
  );
}

function JadwalTab({ data, persist }) {
  const [date, setDate] = useState("");
  const [trainingTypeId, setTrainingTypeId] = useState(data.trainingTypes[0]?.id || "");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editState, setEditState] = useState({});

  function add() {
    if (!date || !trainingTypeId) return;
    persist({ ...data, schedules: [...data.schedules, { id: uid("sch"), date, trainingTypeId, note: note.trim() }] });
    setDate(""); setNote("");
  }

  function remove(id) {
    persist({
      ...data,
      schedules: data.schedules.filter((s) => s.id !== id),
      attendance: data.attendance.filter((a) => a.scheduleId !== id),
    });
  }

  function startEdit(s) { setEditingId(s.id); setEditState({ date: s.date, trainingTypeId: s.trainingTypeId, note: s.note }); }
  function saveEdit(id) {
    persist({ ...data, schedules: data.schedules.map((s) => (s.id === id ? { ...s, ...editState } : s)) });
    setEditingId(null);
  }

  const sorted = [...data.schedules].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="flex flex-col gap-4">
      <div className="pr-card rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold opacity-70">Tanggal</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="pr-input rounded-lg px-3 py-2 border" style={{ borderColor: COLORS.line }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold opacity-70">Jenis latihan</label>
          <select value={trainingTypeId} onChange={(e) => setTrainingTypeId(e.target.value)} className="pr-input rounded-lg px-3 py-2 border" style={{ borderColor: COLORS.line }}>
            {data.trainingTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
          <label className="text-xs font-semibold opacity-70">Catatan (opsional)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} className="pr-input rounded-lg px-3 py-2 border w-full" style={{ borderColor: COLORS.line }} placeholder="cth. Lapangan utama, bawa tongkat" />
        </div>
        <button type="button" onClick={add} disabled={data.trainingTypes.length === 0} className="pr-btn flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-40" style={{ background: COLORS.forest }}>
          <Plus size={15} /> Tambah Jadwal
        </button>
      </div>
      {data.trainingTypes.length === 0 && <p className="text-xs opacity-60">Buat jenis latihan dulu di tab "Jenis Latihan".</p>}

      <div className="flex flex-col gap-2">
        {sorted.map((s) => {
          const tt = data.trainingTypes.find((t) => t.id === s.trainingTypeId);
          return (
            <div key={s.id} className="pr-card rounded-xl p-3 flex flex-wrap items-center gap-3 justify-between">
              {editingId === s.id ? (
                <div className="flex flex-wrap gap-2 flex-1 items-end">
                  <input type="date" value={editState.date} onChange={(e) => setEditState((s2) => ({ ...s2, date: e.target.value }))} className="pr-input rounded-lg px-2 py-1 border" style={{ borderColor: COLORS.line }} />
                  <select value={editState.trainingTypeId} onChange={(e) => setEditState((s2) => ({ ...s2, trainingTypeId: e.target.value }))} className="pr-input rounded-lg px-2 py-1 border" style={{ borderColor: COLORS.line }}>
                    {data.trainingTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input value={editState.note} onChange={(e) => setEditState((s2) => ({ ...s2, note: e.target.value }))} className="pr-input rounded-lg px-2 py-1 border flex-1 min-w-[120px]" style={{ borderColor: COLORS.line }} />
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="pr-mono text-xs font-semibold px-2 py-1 rounded-md" style={{ background: COLORS.bg }}>{fmtDate(s.date)}</div>
                  <div>
                    <p className="text-sm font-semibold">{tt?.name || "(dihapus)"}</p>
                    {s.note && <p className="text-xs opacity-60">{s.note}</p>}
                  </div>
                </div>
              )}
              <div className="flex gap-1">
                {editingId === s.id ? (
                  <button onClick={() => saveEdit(s.id)} className="pr-btn p-1.5 rounded-md" style={{ background: `${COLORS.green}22` }}><Save size={14} style={{ color: COLORS.green }} /></button>
                ) : (
                  <button onClick={() => startEdit(s)} className="pr-btn p-1.5 rounded-md" style={{ background: COLORS.bg }}><Pencil size={14} /></button>
                )}
                <button onClick={() => remove(s.id)} className="pr-btn p-1.5 rounded-md" style={{ background: `${COLORS.red}22` }}><Trash2 size={14} style={{ color: COLORS.red }} /></button>
              </div>
            </div>
          );
        })}
        {sorted.length === 0 && <p className="text-sm opacity-50">Belum ada jadwal latihan.</p>}
      </div>
    </div>
  );
}

function AbsensiTab({ data, persist }) {
  const sorted = [...data.schedules].sort((a, b) => (a.date < b.date ? 1 : -1));
  const [scheduleId, setScheduleId] = useState(sorted[0]?.id || "");
  const schedule = data.schedules.find((s) => s.id === scheduleId);
  const trainingType = schedule ? data.trainingTypes.find((t) => t.id === schedule.trainingTypeId) : null;

  const [rows, setRows] = useState({}); // memberId -> {status, skillScore}

  useEffect(() => {
    if (!scheduleId) { setRows({}); return; }
    const existing = data.attendance.filter((a) => a.scheduleId === scheduleId);
    const map = {};
    data.members.forEach((m) => {
      const rec = existing.find((a) => a.memberId === m.id);
      map[m.id] = rec ? { status: rec.status, skillScore: rec.skillScore ?? 70 } : { status: STATUS.HADIR, skillScore: 70 };
    });
    setRows(map);
  }, [scheduleId, data.members.length]);

  function setRow(memberId, patch) {
    setRows((r) => ({ ...r, [memberId]: { ...r[memberId], ...patch } }));
  }

  function saveAll() {
    const others = data.attendance.filter((a) => a.scheduleId !== scheduleId);
    const newRecords = data.members.map((m) => ({
      id: uid("att"),
      scheduleId,
      memberId: m.id,
      status: rows[m.id]?.status || STATUS.ALPA,
      skillScore: rows[m.id]?.status === STATUS.HADIR ? Number(rows[m.id]?.skillScore ?? 70) : null,
    }));
    persist({ ...data, attendance: [...others, ...newRecords] });
  }

  if (data.schedules.length === 0) {
    return <p className="text-sm opacity-60">Buat jadwal dulu di tab "Jadwal" sebelum mengambil absensi.</p>;
  }
  if (data.members.length === 0) {
    return <p className="text-sm opacity-60">Tambahkan peserta dulu di tab "Peserta" sebelum mengambil absensi.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="pr-card rounded-xl p-4 flex flex-wrap gap-3 items-end justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold opacity-70">Pilih jadwal</label>
          <select value={scheduleId} onChange={(e) => setScheduleId(e.target.value)} className="pr-input rounded-lg px-3 py-2 border min-w-[260px]" style={{ borderColor: COLORS.line }}>
            {sorted.map((s) => {
              const tt = data.trainingTypes.find((t) => t.id === s.trainingTypeId);
              return <option key={s.id} value={s.id}>{fmtDate(s.date)} — {tt?.name}</option>;
            })}
          </select>
        </div>
        {trainingType && <div className="text-xs opacity-60">Skill yang dilatih: <b>{trainingType.name}</b></div>}
        <button onClick={saveAll} className="pr-btn flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: COLORS.forest }}>
          <Save size={15} /> Simpan Absensi
        </button>
      </div>

      <div className="pr-card rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead style={{ background: COLORS.bg }}>
            <tr className="text-left">
              <th className="p-3">Nama</th>
              <th className="p-3">Status</th>
              <th className="p-3">Skor Skill (jika hadir)</th>
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => {
              const row = rows[m.id] || { status: STATUS.HADIR, skillScore: 70 };
              return (
                <tr key={m.id} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                  <td className="p-3 font-medium">{m.name}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {Object.values(STATUS).map((st) => (
                        <button
                          key={st}
                          onClick={() => setRow(m.id, { status: st })}
                          className="pr-btn"
                        >
                          <span style={{ opacity: row.status === st ? 1 : 0.35 }}><StatusPill status={st} /></span>
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="p-3">
                    {row.status === STATUS.HADIR ? (
                      <input
                        type="range" min={0} max={100} value={row.skillScore}
                        onChange={(e) => setRow(m.id, { skillScore: Number(e.target.value) })}
                        className="w-40 align-middle"
                      />
                    ) : <span className="text-xs opacity-40">—</span>}
                    {row.status === STATUS.HADIR && <span className="pr-mono text-xs ml-2">{row.skillScore}</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============================== MEMBER APP ============================== */

function MemberApp({ data, memberId, onLogout }) {
  const member = data.members.find((m) => m.id === memberId);

  const stats = useMemo(() => {
    if (!member) return null;
    const records = data.attendance.filter((a) => a.memberId === member.id);
    const withSchedule = records
      .map((r) => ({ ...r, schedule: data.schedules.find((s) => s.id === r.scheduleId) }))
      .filter((r) => r.schedule)
      .sort((a, b) => (a.schedule.date > b.schedule.date ? 1 : -1));

    const hadir = withSchedule.filter((r) => r.status === STATUS.HADIR).length;
    const izin = withSchedule.filter((r) => r.status === STATUS.IZIN).length;
    const alpa = withSchedule.filter((r) => r.status === STATUS.ALPA).length;
    const total = withSchedule.length;
    const overallPct = total ? Math.round((hadir / total) * 100) : 0;

    const perTraining = data.trainingTypes.map((t) => {
      const recs = withSchedule.filter((r) => r.schedule.trainingTypeId === t.id);
      const totalT = recs.length;
      const hadirT = recs.filter((r) => r.status === STATUS.HADIR).length;
      const attendancePct = totalT ? Math.round((hadirT / totalT) * 100) : 0;
      const scored = recs.filter((r) => r.status === STATUS.HADIR && typeof r.skillScore === "number");
      const avgScore = scored.length ? Math.round(scored.reduce((a, b) => a + b.skillScore, 0) / scored.length) : null;
      let improvement = null;
      if (scored.length >= 2) {
        improvement = scored[scored.length - 1].skillScore - scored[0].skillScore;
      }
      return { training: t, totalT, attendancePct, avgScore, improvement, hasData: totalT > 0 };
    });

    return { withSchedule, hadir, izin, alpa, total, overallPct, perTraining };
  }, [data, member]);

  if (!member || !stats) {
    return (
      <div className="min-h-[600px] flex items-center justify-center p-8">
        <p className="text-sm opacity-60">Data anggota tidak ditemukan.</p>
      </div>
    );
  }

  return (
    <div className="min-h-[600px] flex flex-col">
      <header className="flex items-center justify-between px-5 py-4" style={{ background: COLORS.forest }}>
        <div className="flex items-center gap-2 text-white">
          <Award size={20} />
          <div>
            <p className="pr-display text-2xl leading-none">{member.name}</p>
            <p className="pr-mono text-[11px] opacity-70">Tag: {member.tagCode}</p>
          </div>
        </div>
        <button onClick={onLogout} className="pr-btn flex items-center gap-1 text-white text-sm font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#ffffff22" }}>
          <LogOut size={15} /> Keluar
        </button>
      </header>

      <div className="p-5 flex flex-col gap-6" style={{ background: COLORS.bg }}>
        <NextScheduleReminder schedules={data.schedules} trainingTypes={data.trainingTypes} />

        {/* Ringkasan */}
        <div className="pr-card rounded-xl p-5 flex flex-wrap items-center gap-6 justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <BadgeRing pct={stats.overallPct} size={110} label="Kehadiran Keseluruhan" sub={`${stats.hadir}/${stats.total} sesi`} />
            <div className="flex gap-4 flex-wrap">
              <MiniStat label="Hadir" value={stats.hadir} color={COLORS.green} Icon={CheckCircle2} />
              <MiniStat label="Izin" value={stats.izin} color={COLORS.gold} Icon={Clock3} />
              <MiniStat label="Alpa" value={stats.alpa} color={COLORS.red} Icon={XCircle} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => exportMemberToExcel(data, member)} className="pr-btn flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: COLORS.forest }}>
              <Download size={15} /> Unduh Laporan Excel
            </button>
            <button onClick={() => printMemberReport(data, member)} className="pr-btn flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border" style={{ borderColor: COLORS.line }}>
              <Printer size={15} /> Cetak / Simpan PDF
            </button>
          </div>
        </div>

        {/* Per jenis latihan */}
        <div>
          <h3 className="pr-display text-xl mb-3" style={{ color: COLORS.forest }}>PERKEMBANGAN PER SKILL LATIHAN</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.perTraining.map((pt) => (
              <div key={pt.training.id} className="pr-card rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Award size={16} style={{ color: COLORS.gold }} />
                  <span className="font-semibold text-sm">{pt.training.name}</span>
                </div>
                {pt.hasData ? (
                  <>
                    <div className="flex items-center justify-between">
                      <BadgeRing pct={pt.attendancePct} size={64} thickness={6} />
                      <div className="text-right">
                        <p className="text-xs opacity-60">Kehadiran latihan ini</p>
                        <p className="text-xs opacity-60">{pt.totalT} sesi tercatat</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2" style={{ borderTop: `1px dashed ${COLORS.line}` }}>
                      <div>
                        <p className="text-xs opacity-60">Skor skill rata-rata</p>
                        <p className="pr-mono font-bold text-lg" style={{ color: COLORS.forest }}>{pt.avgScore ?? "-"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs opacity-60">Peningkatan</p>
                        <ImprovementTag value={pt.improvement} />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs opacity-50">Belum ada catatan untuk latihan ini.</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Riwayat */}
        <div>
          <h3 className="pr-display text-xl mb-3" style={{ color: COLORS.forest }}>RIWAYAT LATIHAN</h3>
          <div className="pr-card rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead style={{ background: COLORS.paper }}>
                <tr className="text-left">
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Latihan</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Skor</th>
                </tr>
              </thead>
              <tbody>
                {[...stats.withSchedule].reverse().map((r) => {
                  const tt = data.trainingTypes.find((t) => t.id === r.schedule.trainingTypeId);
                  return (
                    <tr key={r.id} style={{ borderTop: `1px solid ${COLORS.line}` }}>
                      <td className="p-3 pr-mono text-xs">{fmtDate(r.schedule.date)}</td>
                      <td className="p-3">{tt?.name || "-"}</td>
                      <td className="p-3"><StatusPill status={r.status} /></td>
                      <td className="p-3 pr-mono">{r.status === STATUS.HADIR ? (r.skillScore ?? "-") : "-"}</td>
                    </tr>
                  );
                })}
                {stats.withSchedule.length === 0 && (
                  <tr><td colSpan={4} className="p-4 text-center text-sm opacity-50">Belum ada riwayat latihan.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color, Icon }) {
  return (
    <div className="flex items-center gap-2 pr-card rounded-lg px-3 py-2">
      <div className="rounded-full p-1.5" style={{ background: `${color}22` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div>
        <p className="font-bold pr-mono leading-none">{value}</p>
        <p className="text-[11px] opacity-60">{label}</p>
      </div>
    </div>
  );
}

function ImprovementTag({ value }) {
  if (value === null || value === undefined) {
    return <span className="text-xs opacity-40">Belum cukup data</span>;
  }
  if (value === 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: COLORS.ink }}><Minus size={13} /> Stabil</span>;
  }
  const up = value > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const color = up ? COLORS.green : COLORS.red;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color }}>
      <Icon size={13} /> {up ? "+" : ""}{value} poin
    </span>
  );
}
