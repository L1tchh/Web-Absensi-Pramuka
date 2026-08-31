var AppState = {
  data: null,
  view: "login",       // "login" | "admin" | "member"
  currentMemberId: null
};


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

document.addEventListener("DOMContentLoaded", function () {
  AppState.data = loadData();
  render();
});
