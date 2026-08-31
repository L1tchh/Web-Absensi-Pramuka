/* ==========================================================================
   app.js
   Titik masuk aplikasi. Menyimpan state global (data + tampilan aktif),
   menghubungkan ke localStorage, dan mengatur perpindahan antar layar.
   File ini dimuat PALING TERAKHIR karena memakai fungsi dari file lain.
   ========================================================================== */

var AppState = {
  data: null,
  view: "login",       // "login" | "admin" | "member"
  currentMemberId: null
};

// Menyimpan data baru ke state + localStorage
function persist(newData) {
  AppState.data = newData;
  var ok = saveData(newData);
  if (!ok) {
    alert("Gagal menyimpan data ke penyimpanan browser. Periksa apakah mode penyamaran/privat sedang aktif, atau penyimpanan browser penuh.");
  }
}

function goLogin() {
  AppState.view = "login";
  AppState.currentMemberId = null;
  render();
}

function goAdmin() {
  AppState.view = "admin";
  render();
}

function goMember(memberId) {
  AppState.view = "member";
  AppState.currentMemberId = memberId;
  render();
}

// Menggambar ulang seluruh tampilan sesuai AppState saat ini.
// Dipanggil setiap kali ada perubahan data atau perpindahan layar.
function render() {
  var app = document.getElementById("app");
  app.innerHTML = "";

  if (AppState.view === "login") {
    renderLogin(app, AppState.data);
  } else if (AppState.view === "admin") {
    renderAdmin(app, AppState.data);
  } else if (AppState.view === "member") {
    renderMember(app, AppState.data, AppState.currentMemberId);
  }
}

// Jalankan aplikasi setelah seluruh halaman siap
document.addEventListener("DOMContentLoaded", function () {
  AppState.data = loadData();
  render();
});
