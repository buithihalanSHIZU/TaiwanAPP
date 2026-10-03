// state.js
// Chứa state toàn cục của app: user, nhóm, từ vựng, trạng thái activeGroup, mode học, v.v.
export const $ = (selector) => document.querySelector(selector);
export const state = {
  standardGroups: [],
  standardWords: [],
  userGroups: [],
  userWords: [],
  userWordLinks: [],
  groupLinks: [],
  user: null,
  client: null,
  demo: false,
  activeGroup: "all",
  query: "",
  libraryPage: 1,
  studyIndex: 0,
  flipped: false,
  authMode: "login",
  editingGroup: null,
  wordMode: "custom",
};

let toastTimer;

export const duplicateKey = (value) => String(value ?? "").trim().toLocaleLowerCase("vi");
export const escapeHTML = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

export function notify(message) {
  const toast = $("#toast");
  toast.textContent = message;
  if (typeof toast.showPopover === "function" && !toast.matches(":popover-open")) toast.showPopover();
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("visible");
    if (typeof toast.hidePopover === "function" && toast.matches(":popover-open")) toast.hidePopover();
  }, 2400);
}