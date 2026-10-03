// session.js
// Định nghĩa session hiện tại và logic mở/đóng app, refresh dữ liệu và cập nhật UI sau mỗi action.
import { $, notify, state } from "./state.js";
import { refreshData } from "./data.js";
import { render, renderCard } from "../ui/render.js?v=20261003-group-picker";

// openApp(): chuyển màn hình từ auth sang workspace với user đang đăng nhập hoặc chế độ demo.
export function openApp(user, demo = false) {
  state.user = user;
  state.demo = demo;
  $("#auth-view").classList.add("hidden");
  $("#app-view").classList.remove("hidden");
  const label = demo ? "Khách học" : (user.email || "Tài khoản");
  $("#user-name").textContent = label;
  $("#user-avatar").textContent = label.trim().charAt(0).toLocaleUpperCase("vi") || "台";
  $("#account-mode").textContent = demo ? "Dùng thử · trên thiết bị" : "Đã kết nối tài khoản";
  $("#sync-label").textContent = demo ? "Đã lưu trên thiết bị" : "Đồng bộ đám mây";
  refreshData().then(render).catch((error) => notify(`Không tải được dữ liệu: ${error.message}`));
}

// runAction(): 1) chạy thao tác lưu dữ liệu, 2) refresh state, 3) render lại UI và 4) hiển thị toast.
export async function runAction(action, successMessage) {
  try {
    await action();
    await refreshData();
    render();
    renderCard();
    if (successMessage) notify(successMessage);
  } catch (error) {
    notify(error.message || "Có lỗi xảy ra. Vui lòng thử lại.");
  }
}