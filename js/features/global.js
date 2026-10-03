// global.js
// Xử lý sự kiện dùng chung: đóng dialog, hotkey Ctrl/Cmd+K, v.v.
import { $ } from "../core/state.js";

// initGlobalInteractions(): bind hành vi global như đóng modal và focus tìm kiếm.
export function initGlobalInteractions() {
  const appView = $("#app-view");
  const menuToggle = $("#mobile-menu-toggle");
  const menuBackdrop = $("#mobile-menu-backdrop");
  const closeMobileMenu = () => {
    appView.classList.remove("mobile-menu-open");
    menuToggle.setAttribute("aria-expanded", "false");
  };

  menuToggle.addEventListener("click", () => {
    const isOpen = appView.classList.toggle("mobile-menu-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
  menuBackdrop.addEventListener("click", closeMobileMenu);
  document.querySelector(".sidebar").addEventListener("click", (event) => {
    if (event.target.closest(".nav-item, .group-link, #sign-out")) closeMobileMenu();
  });

  document.querySelectorAll("[data-close]").forEach((button) => {
    button.addEventListener("click", () => $(`#${button.dataset.close}`).close());
  });
  document.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === "k") {
      event.preventDefault();
      $("#search-input").focus();
    }
  });
}