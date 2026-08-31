/* ==========================================================================
   data.js
   Semua hal yang berhubungan dengan DATA: bentuk data, membaca/menulis ke
   localStorage, dan perhitungan statistik. Tidak ada kode tampilan di sini.
   ========================================================================== */

// Kunci penyimpanan di localStorage browser
var STORAGE_KEY = "pramuka-absensi-data";

// Status kehadiran yang tersedia
var STATUS = {
  HADIR: "hadir",
  IZIN: "izin",
  ALPA: "alpa"
};

// Contoh jenis latihan bawaan (bisa diedit/dihapus oleh admin)
var SEED_TRAINING_TYPES = [
  { id: "tt-1", name: "Tali Temali" },
  { id: "tt-2", name: "PBB (Baris-Berbaris)" },
  { id: "tt-3", name: "Sandi & Isyarat" },
  { id: "tt-4", name: "Pionering" }
];

// Struktur data awal kalau belum pernah ada data tersimpan
function defaultData() {
  return {
    adminPassword: "admin123",
    members: [],           // { id, name, tagCode }
    trainingTypes: SEED_TRAINING_TYPES.slice(),  // { id, name }
    schedules: [],          // { id, date, trainingTypeId, note }
    attendance: []          // { id, scheduleId, memberId, status, skillScore }
  };
}

// Membaca data dari localStorage. Kalau belum ada / rusak, buat data baru.
function loadData() {
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Gagal membaca data dari localStorage:", e);
  }
  var fresh = defaultData();
  saveData(fresh);
  return fresh;
}

// Menyimpan seluruh data ke localStorage. Mengembalikan true/false.
function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Gagal menyimpan data ke localStorage:", e);
    return false;
  }
}

// Ringkasan kehadiran satu anggota (dipakai di dashboard admin & anggota)
function buildMemberSummary(data, member) {
  var records = data.attendance
    .filter(function (a) { return a.memberId === member.id; })
    .map(function (r) {
      var schedule = data.schedules.find(function (s) { return s.id === r.scheduleId; });
      return Object.assign({}, r, { schedule: schedule });
    })
    .filter(function (r) { return r.schedule; })
    .sort(function (a, b) { return a.schedule.date > b.schedule.date ? 1 : -1; });

  var hadir = records.filter(function (r) { return r.status === STATUS.HADIR; }).length;
  var izin = records.filter(function (r) { return r.status === STATUS.IZIN; }).length;
  var alpa = records.filter(function (r) { return r.status === STATUS.ALPA; }).length;
  var total = records.length;
  var overallPct = total ? Math.round((hadir / total) * 100) : 0;

  return { records: records, hadir: hadir, izin: izin, alpa: alpa, total: total, overallPct: overallPct };
}

// Rincian kehadiran & peningkatan skill per jenis latihan untuk satu anggota
function buildTrainingBreakdown(data, member) {
  var summary = buildMemberSummary(data, member);

  return data.trainingTypes.map(function (t) {
    var recs = summary.records.filter(function (r) { return r.schedule.trainingTypeId === t.id; });
    var totalT = recs.length;
    var hadirT = recs.filter(function (r) { return r.status === STATUS.HADIR; }).length;
    var attendancePct = totalT ? Math.round((hadirT / totalT) * 100) : 0;

    var scored = recs.filter(function (r) { return r.status === STATUS.HADIR && typeof r.skillScore === "number"; });
    var avgScore = scored.length
      ? Math.round(scored.reduce(function (sum, r) { return sum + r.skillScore; }, 0) / scored.length)
      : null;

    var improvement = null;
    if (scored.length >= 2) {
      improvement = scored[scored.length - 1].skillScore - scored[0].skillScore;
    }

    return {
      training: t,
      totalT: totalT,
      attendancePct: attendancePct,
      avgScore: avgScore,
      improvement: improvement,
      hasData: totalT > 0
    };
  });
}
