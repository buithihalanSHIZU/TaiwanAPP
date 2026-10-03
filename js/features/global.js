// global.js
// Xử lý sự kiện dùng chung: đóng dialog, hotkey Ctrl/Cmd+K, v.v.
import { $ } from "../core/state.js";

// initGlobalInteractions(): bind hành vi global như đóng modal và focus tìm kiếm.
export function initGlobalInteractions() {
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