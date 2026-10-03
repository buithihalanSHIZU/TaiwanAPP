// auth.js
// Quản lý màn hình đăng nhập/đăng ký và chế độ demo. Đây là cổng vào của app.
import { $, state } from "../core/state.js";
import { openApp } from "../core/session.js";

// initAuth(): bind, validate và xử lý form auth, plus demo login/logout.
export function initAuth() {
  $("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.client) return;
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value;
    const method = state.authMode === "signup" ? "signUp" : "signInWithPassword";
    const { data, error } = await state.client.auth[method]({ email, password });
    if (error) {
      const duplicateAccount = state.authMode === "signup"
        && (error.code === "user_already_exists" || /already registered|already exists/i.test(error.message));
      $("#auth-message").textContent = duplicateAccount
        ? "Không thể tạo tài khoản: email này đã tồn tại. Hãy đăng nhập."
        : error.message;
      return;
    }
    if (state.authMode === "signup" && data.user?.identities?.length === 0) {
      $("#auth-message").textContent = "Không thể tạo tài khoản: email này đã tồn tại. Hãy đăng nhập.";
      return;
    }
    if (data.session) openApp(data.session.user);
    else $("#auth-message").textContent = "Kiểm tra email để xác nhận tài khoản, rồi đăng nhập nhé.";
  });

  $("#auth-switch").addEventListener("click", () => {
    state.authMode = state.authMode === "login" ? "signup" : "login";
    $("#auth-submit").textContent = state.authMode === "signup" ? "Tạo tài khoản" : "Đăng nhập";
    $("#auth-switch").textContent = state.authMode === "signup" ? "Đã có tài khoản? Đăng nhập" : "Chưa có tài khoản? Đăng ký";
    $("#auth-password").autocomplete = state.authMode === "signup" ? "new-password" : "current-password";
    $("#auth-message").textContent = "";
  });

  $("#demo-enter").addEventListener("click", () => openApp({ email: "Khách học" }, true));
  $("#sign-out").addEventListener("click", async () => {
    if (!state.demo && state.client) await state.client.auth.signOut();
    state.user = null;
    state.demo = false;
    $("#app-view").classList.add("hidden");
    $("#auth-view").classList.remove("hidden");
  });
}

// configureAuth(): bật/tắt form auth theo việc app có backend hay không.
export function configureAuth(hasBackend) {
  if (hasBackend) {
    $("#backend-note").textContent = "Tài khoản và dữ liệu được bảo vệ bằng Supabase Row Level Security.";
    return;
  }
  $("#auth-submit").disabled = true;
  $("#auth-switch").disabled = true;
  $("#backend-note").textContent = "Để tạo tài khoản và đồng bộ dữ liệu, hãy cấu hình Supabase theo README.md.";
}