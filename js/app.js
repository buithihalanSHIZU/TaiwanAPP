// app.js
// Nạp các view HTML chính vào DOM và khởi chạy ứng dụng sau khi giao diện đã sẵn sàng.
const views = [
  ["#auth-mount", "./views/auth.html"],
  ["#workspace-mount", "./views/workspace.html"],
  ["#word-dialog-mount", "./views/word-dialog.html"],
  ["#group-dialog-mount", "./views/group-dialog.html"],
  ["#study-dialog-mount", "./views/study-dialog.html"],
];

async function mountView([selector, path]) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Không tải được giao diện: ${path}`);
  document.querySelector(selector).innerHTML = await response.text();
}

try {
  await Promise.all(views.map(mountView));
  const { startApp } = await import("./bootstrap.js?v=20261003-group-picker");
  startApp();
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch((error) => {
      console.warn("Không thể bật chế độ PWA offline:", error);
    });
  }
} catch (error) {
  const toast = document.querySelector("#toast");
  toast.textContent = error.message;
  toast.classList.add("visible");
}