// vocabulary.js
// Quản lý thêm/sửa/xóa từ vựng, tìm trong thư viện và gắn từ vào nhóm cá nhân.
import { $, duplicateKey, notify, state } from "../core/state.js";
import { persist } from "../core/data.js";
import { runAction } from "../core/session.js?v=20261003-group-picker";
import { activeGroupInfo, openWordDialog, renderGroups, renderLibraryResults, renderWords, syncTargetGroupPicker } from "../ui/render.js?v=20261003-group-picker";

// openAddWord(): mở dialog thêm từ với chế độ custom hoặc library phù hợp group đang chọn.
function openAddWord(mode = "custom", preferredWord = null) {
  if (!state.userGroups.length) {
    notify("Tạo nhóm của tôi trước khi thêm từ.");
    $("#manage-groups").click();
    return;
  }
  const active = activeGroupInfo();
  const targetGroupId = active.type === "user" ? active.group.id : "";
  openWordDialog(null, targetGroupId, mode);
  if (preferredWord) {
    $("#library-search-input").value = preferredWord.traditional;
    renderLibraryResults();
  }
}

// initVocabulary(): bind toàn bộ sự kiện của danh sách từ, form thêm từ, tìm kiếm và chọn nhóm.
export function initVocabulary() {
  // Mở đúng chế độ thêm theo ngữ cảnh: nhóm cá nhân cho phép tự tạo, còn thư viện dùng tìm kiếm.
  $("#top-add-word").addEventListener("click", () => openAddWord(activeGroupInfo().type === "user" ? "custom" : "library"));
  $("#empty-add-word").addEventListener("click", () => openAddWord("library"));

  // Lưu từ khóa và bộ lọc đang chọn vào state trước khi render lại danh sách.
  $("#search-input").addEventListener("input", (event) => {
    state.query = event.target.value;
    state.libraryPage = 1;
    renderWords();
  });
  $("#group-filter").addEventListener("change", (event) => {
    state.activeGroup = event.target.value;
    state.libraryPage = 1;
    renderGroups();
    renderWords();
  });

  // Dùng event delegation vì các nút nhóm được tạo lại mỗi lần render.
  $("#group-nav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-group-filter]");
    if (!button) return;
    state.activeGroup = button.dataset.groupFilter;
    state.libraryPage = 1;
    $("#group-filter").value = state.activeGroup;
    renderGroups();
    renderWords();
  });

  $("#vocabulary-pagination").addEventListener("click", (event) => {
    const button = event.target.closest("[data-library-page]");
    if (!button) return;
    const page = button.dataset.libraryPage;
    if (page === "first") state.libraryPage = 1;
    if (page === "previous") state.libraryPage = Math.max(1, state.libraryPage - 1);
    if (page === "next") state.libraryPage += 1;
    if (page === "last") state.libraryPage = Number.MAX_SAFE_INTEGER;
    renderWords();
  });

  // Phân biệt thao tác trên từng từ bằng data-*; xóa liên kết không xóa từ gốc trong thư viện.
  $("#vocabulary-list").addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-word-edit]");
    const deleteButton = event.target.closest("[data-word-delete]");
    const addButton = event.target.closest("[data-library-add]");
    const unlinkButton = event.target.closest("[data-link-remove]");
    const unlinkUserWordButton = event.target.closest("[data-user-link-remove]");
    if (editButton) {
      const word = state.userWords.find((item) => item.id === editButton.dataset.wordEdit);
      const active = activeGroupInfo();
      openWordDialog(word, active.type === "user" ? active.group.id : word?.group_id, "custom");
    }
    if (addButton) {
      const word = state.standardWords.find((item) => item.id === addButton.dataset.libraryAdd);
      openAddWord("library", word);
    }
    if (unlinkButton && confirm("Bỏ từ này khỏi nhóm? Từ trong thư viện và tiến độ học của bạn vẫn được giữ.")) {
      runAction(() => persist("user_group_vocabulary", "delete", { group_id: unlinkButton.dataset.groupId, vocabulary_id: unlinkButton.dataset.linkRemove }), "Đã bỏ từ khỏi nhóm.");
    }
    if (unlinkUserWordButton && confirm("Bỏ từ riêng này khỏi nhóm? Từ vẫn được giữ trong thư viện cá nhân.")) {
      runAction(() => persist("user_group_user_vocabulary", "delete", { group_id: unlinkUserWordButton.dataset.groupId, vocabulary_id: unlinkUserWordButton.dataset.userLinkRemove }), "Đã bỏ từ khỏi nhóm.");
    }
    if (deleteButton) {
      const word = state.userWords.find((item) => item.id === deleteButton.dataset.wordDelete);
      if (word && confirm(`Xoá vĩnh viễn “${word.traditional}”?`)) runAction(() => persist("user_vocabulary", "delete", null, word.id), "Đã xóa từ riêng.");
    }
  });

  // Chuyển giữa nhập từ riêng và tìm từ thư viện; khi đang sửa từ riêng thì khóa chế độ thư viện.
  document.querySelectorAll("[data-word-mode]").forEach((button) => button.addEventListener("click", () => {
    if ($("#word-dialog").dataset.editing && button.dataset.wordMode === "library") return notify("Từ riêng chỉ có thể sửa trong chế độ tự tạo.");
    state.wordMode = button.dataset.wordMode;
    document.querySelectorAll("[data-word-mode]").forEach((item) => {
      const active = item.dataset.wordMode === state.wordMode;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    $("#word-custom-fields").classList.toggle("hidden", state.wordMode !== "custom");
    $("#library-panel").classList.toggle("hidden", state.wordMode !== "library");
    $("#word-save").classList.toggle("hidden", state.wordMode !== "custom");
    renderLibraryResults();
  }));
  $("#library-search-input").addEventListener("input", renderLibraryResults);
  $("#add-word-target").addEventListener("change", () => {
    syncTargetGroupPicker();
    renderLibraryResults();
  });
  $("#add-word-target-trigger").addEventListener("click", () => {
    const menu = $("#add-word-target-menu");
    const open = menu.classList.toggle("hidden");
    $("#add-word-target-trigger").setAttribute("aria-expanded", String(!open));
  });
  $("#add-word-target-menu").addEventListener("click", (event) => {
    const option = event.target.closest("[data-target-group-id]");
    if (!option) return;
    $("#add-word-target").value = option.dataset.targetGroupId;
    $("#add-word-target").dispatchEvent(new Event("change", { bubbles: true }));
    $("#add-word-target-menu").classList.add("hidden");
    $("#add-word-target-trigger").setAttribute("aria-expanded", "false");
    $("#add-word-target-trigger").focus();
  });
  document.addEventListener("click", (event) => {
    if (event.target.closest(".group-picker")) return;
    $("#add-word-target-menu").classList.add("hidden");
    $("#add-word-target-trigger").setAttribute("aria-expanded", "false");
  });
  document.addEventListener("keydown", (event) => {
    const menu = $("#add-word-target-menu");
    if (event.key !== "Escape" || menu.classList.contains("hidden")) return;
    event.preventDefault();
    event.stopPropagation();
    menu.classList.add("hidden");
    $("#add-word-target-trigger").setAttribute("aria-expanded", "false");
    $("#add-word-target-trigger").focus();
  });

  // Thêm từ thư viện bằng cách tạo liên kết với nhóm đích, không sao chép bản ghi từ.
  $("#library-results").addEventListener("click", (event) => {
    const button = event.target.closest("[data-library-add]");
    if (!button) return;
    const groupId = $("#add-word-target").value;
    if (!groupId) return notify("Chọn nhóm nhận từ trước.");
    const table = button.dataset.librarySource === "user" ? "user_group_user_vocabulary" : "user_group_vocabulary";
    const successMessage = button.dataset.librarySource === "user" ? "Đã thêm từ có sẵn vào nhóm." : "Đã thêm từ thư viện vào nhóm.";
    runAction(() => persist(table, "insert", { group_id: groupId, vocabulary_id: button.dataset.libraryAdd }), successMessage).then(renderLibraryResults);
  });

  $("#word-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.wordMode !== "custom") return;
    const wordId = $("#word-id").value;
    const groupId = $("#add-word-target").value;
    if (!groupId && !wordId) return notify("Chọn nhóm nhận từ trước.");

    // Chuẩn hóa dữ liệu form trước khi kiểm tra trùng và lưu vào kho từ riêng.
    const payload = {
      traditional: $("#word-traditional").value.trim(),
      zhuyin: $("#word-zhuyin").value.trim(),
      pinyin: $("#word-pinyin").value.trim(),
      han_viet: $("#word-han-viet").value.trim(),
      meaning: $("#word-meaning").value.trim(),
      usage_vi: $("#word-usage").value.trim(),
      example: $("#word-example").value.trim(),
    };
    const existing = state.userWords.find((word) => word.id === wordId);

    // Từ riêng trùng được chặn; thông báo kèm các nhóm đang chứa từ đó.
    const duplicateWords = state.userWords.filter((word) => word.id !== wordId && duplicateKey(word.traditional) === duplicateKey(payload.traditional));
    if (duplicateWords.length && (!wordId || duplicateKey(existing?.traditional) !== duplicateKey(payload.traditional))) {
      const groupNames = [...new Set(duplicateWords
        .flatMap((word) => {
          const linkedGroups = state.userWordLinks
            .filter((link) => link.vocabulary_id === word.id)
            .map((link) => state.userGroups.find((group) => group.id === link.group_id)?.name);
          return linkedGroups.length ? linkedGroups : [state.userGroups.find((group) => group.id === word.group_id)?.name];
        })
        .filter(Boolean))];
      const groupMessage = groupNames.length ? `: ${groupNames.join(", ")}` : "";
      if (!wordId) {
        $("#library-search-input").value = payload.traditional;
        document.querySelector('[data-word-mode="library"]').click();
      }
      return notify(`Đã có trong nhóm cá nhân${groupMessage}.`);
    }

    // Nếu trùng thư viện chuẩn, báo cả bài học gốc lẫn các nhóm cá nhân đã liên kết từ đó.
    const libraryWord = state.standardWords.find((word) => duplicateKey(word.traditional) === duplicateKey(payload.traditional));
    if (libraryWord && (!wordId || duplicateKey(existing?.traditional) !== duplicateKey(payload.traditional))) {
      const groupNames = [
        state.standardGroups.find((group) => group.id === libraryWord.standard_group_id)?.name,
        ...state.groupLinks
          .filter((link) => link.vocabulary_id === libraryWord.id)
          .map((link) => state.userGroups.find((group) => group.id === link.group_id)?.name),
      ].filter(Boolean);
      const groupMessage = groupNames.length ? `: ${[...new Set(groupNames)].join(", ")}` : "";
      if (!wordId) {
        $("#library-search-input").value = payload.traditional;
        document.querySelector('[data-word-mode="library"]').click();
      }
      return notify(`Đã có trong thư viện${groupMessage}.`);
    }

    // Đóng form rồi tạo mới hoặc cập nhật theo việc wordId có tồn tại hay không.
    $("#word-dialog").close();
    runAction(async () => {
      if (wordId) return persist("user_vocabulary", "update", payload, wordId);
      const vocabularyId = await persist("user_vocabulary", "insert", { ...payload, group_id: null, learned: false });
      await persist("user_group_user_vocabulary", "insert", { group_id: groupId, vocabulary_id: vocabularyId });
    }, wordId ? "Đã cập nhật từ riêng." : "Đã thêm từ riêng vào nhóm.");
  });
}