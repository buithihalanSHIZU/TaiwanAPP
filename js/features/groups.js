// groups.js
// Quản lý nhóm người dùng: tạo, sửa tên, xóa, tìm kiếm nhóm cá nhân.
import { $, duplicateKey, notify, state } from "../core/state.js";
import { persist } from "../core/data.js";
import { runAction } from "../core/session.js";
import { renderGroups } from "../ui/render.js";

// openGroupManager(): mở dialog quản lý nhóm và render lại danh sách.
function openGroupManager() {
  $("#group-search").value = "";
  renderGroups();
  $("#group-dialog").showModal();
}

// initGroups(): bind form và sự kiện tương tác liên quan tới nhóm cá nhân.
export function initGroups() {
  $("#manage-groups").addEventListener("click", openGroupManager);
  $("#add-group-inline").addEventListener("click", openGroupManager);
  $("#add-group-shortcut").addEventListener("click", openGroupManager);
  $("#group-search").addEventListener("input", renderGroups);
  $("#group-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const name = $("#new-group-name").value.trim();
    if (!name) return;
    if (state.userGroups.some((group) => duplicateKey(group.name) === duplicateKey(name))) return notify("Tên nhóm này đã tồn tại.");
    $("#new-group-name").value = "";
    runAction(() => persist("user_groups", "insert", { name }), "Đã tạo nhóm của tôi.");
  });

  $("#group-manager-list").addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-group-edit]");
    const saveButton = event.target.closest("[data-group-save]");
    const cancelButton = event.target.closest("[data-group-cancel]");
    const deleteButton = event.target.closest("[data-group-delete]");
    if (editButton) {
      state.editingGroup = editButton.dataset.groupEdit;
      renderGroups();
      $(`[data-group-name="${CSS.escape(state.editingGroup)}"]`).focus();
    }
    if (cancelButton) {
      state.editingGroup = null;
      renderGroups();
    }
    if (saveButton) {
      const group = state.userGroups.find((item) => item.id === saveButton.dataset.groupSave);
      const name = $(`[data-group-name="${CSS.escape(saveButton.dataset.groupSave)}"]`).value.trim();
      if (!group || !name) return notify("Tên nhóm không được để trống.");
      if (state.userGroups.some((item) => item.id !== group.id && duplicateKey(item.name) === duplicateKey(name))) return notify("Tên nhóm này đã tồn tại.");
      state.editingGroup = null;
      runAction(() => persist("user_groups", "update", { name }, group.id), "Đã cập nhật nhóm.");
    }
    if (deleteButton) {
      const group = state.userGroups.find((item) => item.id === deleteButton.dataset.groupDelete);
      if (group && confirm(`Xóa nhóm “${group.name}” và các từ đã thêm vào nhóm?`)) runAction(() => persist("user_groups", "delete", null, group.id), "Đã xóa nhóm của tôi.");
    }
  });
}