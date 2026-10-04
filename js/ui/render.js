import { $, escapeHTML, notify, state } from "../core/state.js";

// render.js
// File này chịu trách nhiệm render toàn bộ giao diện dữ liệu từ vựng và flashcard.
// Nó lấy dữ liệu từ state, nối chuỗi HTML, và gắn vào DOM để người dùng tương tác.
// Các hàm trong file chủ yếu xử lý: danh sách nhóm, danh sách từ, dialog thêm từ, và card ôn tập.

// groupKey(): tạo định danh duy nhất cho nhóm chuẩn hoặc nhóm user theo dạng "standard:id" / "user:id".
const groupKey = (type, id) => `${type}:${id}`;

// activeGroupInfo(): xác định nhóm hiện tại đang chọn trong sidebar và trả về định dạng chuẩn để render.
export function activeGroupInfo() {
  if (state.activeGroup === "custom" || state.activeGroup === "learned") {
    return { type: state.activeGroup, group: null };
  }
  if (state.activeGroup.startsWith("standard:")) {
    const group = state.standardGroups.find((item) => item.id === state.activeGroup.slice(9));
    return group ? { type: "standard", group } : { type: "all", group: null };
  }
  if (state.activeGroup.startsWith("user:")) {
    const group = state.userGroups.find((item) => item.id === state.activeGroup.slice(5));
    return group ? { type: "user", group } : { type: "all", group: null };
  }
  return { type: "all", group: null };
}

// visibleWords(): trả về danh sách từ hiện tại có thể thấy theo nhóm đang chọn, kèm source để biết đây là chuẩn hay từ của người dùng.
export function visibleWords() {
  const { type, group } = activeGroupInfo();
  if (type === "custom") return state.userWords.map((word) => ({ word, source: "user" }));
  if (type === "learned") return [
    ...state.standardWords.filter((word) => word.learned).map((word) => ({ word, source: "standard" })),
    ...state.userWords.filter((word) => word.learned).map((word) => ({ word, source: "user" })),
  ];
  if (type === "standard") return state.standardWords.filter((word) => word.standard_group_id === group.id).map((word) => ({ word, source: "standard" }));
  if (type === "user") {
    const linkedIds = new Set(state.groupLinks.filter((link) => link.group_id === group.id).map((link) => link.vocabulary_id));
    const customIds = new Set(state.userWordLinks.filter((link) => link.group_id === group.id).map((link) => link.vocabulary_id));
    const linked = state.standardWords.filter((word) => linkedIds.has(word.id)).map((word) => ({ word, source: "linked-standard" }));
    const custom = state.userWords.filter((word) => customIds.has(word.id)).map((word) => ({ word, source: "user" }));
    return [...linked, ...custom];
  }
  return [
    ...state.standardWords.map((word) => ({ word, source: "standard" })),
    ...state.userWords.map((word) => ({ word, source: "user" })),
  ];
}

// groupWordCount(): đếm tổng số từ trong một nhóm, bao gồm cả từ liên kết từ thư viện chuẩn và từ user riêng.
function groupWordCount(groupId) {
  return state.groupLinks.filter((link) => link.group_id === groupId).length
    + state.userWordLinks.filter((link) => link.group_id === groupId).length;
}

export function syncTargetGroupPicker() {
  const target = $("#add-word-target");
  const trigger = $("#add-word-target-trigger");
  const selectedLabel = $("#add-word-target-value");
  const menu = $("#add-word-target-menu");
  if (!target || !trigger || !selectedLabel || !menu) return;

  const selectedGroup = state.userGroups.find((group) => group.id === target.value);
  selectedLabel.textContent = selectedGroup?.name || "Chọn nhóm cá nhân";
  trigger.setAttribute("aria-label", `Nhóm nhận từ: ${selectedLabel.textContent}`);
  trigger.disabled = state.userGroups.length === 0;
  menu.innerHTML = state.userGroups.map((group) => {
    const selected = group.id === target.value;
    return `<button class="group-picker-option ${selected ? "selected" : ""}" type="button" role="option" data-target-group-id="${escapeHTML(group.id)}" aria-selected="${selected}">${escapeHTML(group.name)}</button>`;
  }).join("");
}

function userWordGroupNames(vocabularyId) {
  return state.userWordLinks
    .filter((link) => link.vocabulary_id === vocabularyId)
    .map((link) => state.userGroups.find((group) => group.id === link.group_id)?.name)
    .filter(Boolean);
}

// render(): tổng hợp render cho dashboard chính: nhóm, từ, và thống kê nhanh.
export function render() {
  renderGroups();
  renderWords();
  $("#stat-total").textContent = state.standardWords.length;
  $("#stat-groups").textContent = state.userGroups.length;
  $("#stat-learned").textContent = learnedWords().length;
  $("#word-count-nav").textContent = visibleWords().length;
}

// renderGroups(): render sidebar nhóm, filter, selector ôn từ, và danh sách quản lý nhóm cá nhân.
export function renderGroups() {
  const groupSearch = $("#group-search").value.trim().toLocaleLowerCase("vi");
  const standardNav = state.standardGroups.map((group) => `<button class="group-link ${state.activeGroup === groupKey("standard", group.id) ? "selected" : ""}" data-group-filter="${groupKey("standard", escapeHTML(group.id))}"><span class="group-dot dot-${(group.lesson_number - 1) % 4}"></span><span>${escapeHTML(group.name)}</span><small>${state.standardWords.filter((word) => word.standard_group_id === group.id).length}</small></button>`).join("");
  const userNav = state.userGroups.map((group, index) => `<button class="group-link ${state.activeGroup === groupKey("user", group.id) ? "selected" : ""}" data-group-filter="${groupKey("user", escapeHTML(group.id))}"><span class="group-dot dot-${index % 4}"></span><span>${escapeHTML(group.name)}</span><small>${groupWordCount(group.id)}</small></button>`).join("");
  $("#group-nav").innerHTML = `<button class="group-link ${state.activeGroup === "all" ? "selected" : ""}" data-group-filter="all"><span class="group-dot dot-all"></span><span>Toàn bộ thư viện</span><small>${state.standardWords.length + state.userWords.length}</small></button><button class="group-link ${state.activeGroup === "custom" ? "selected" : ""}" data-group-filter="custom"><span class="group-dot dot-all"></span><span>Từ tự thêm</span><small>${state.userWords.length}</small></button><button class="group-link ${state.activeGroup === "learned" ? "selected" : ""}" data-group-filter="learned"><span class="group-dot dot-all"></span><span>Từ đã thuộc</span><small>${learnedWords().length}</small></button><div class="group-nav-label">BÀI CHUẨN</div>${standardNav}<div class="group-nav-label">NHÓM CỦA TÔI</div>${userNav || `<p class="group-nav-empty">Chưa có nhóm riêng</p>`}`;

  const filter = $("#group-filter");
  const selected = filter.value || state.activeGroup;
  filter.innerHTML = `<option value="all">Toàn bộ thư viện</option><option value="custom">Từ tự thêm</option><option value="learned">Từ đã thuộc</option><optgroup label="Bài chuẩn">${state.standardGroups.map((group) => `<option value="${escapeHTML(groupKey("standard", group.id))}">${escapeHTML(group.name)}</option>`).join("")}</optgroup><optgroup label="Nhóm của tôi">${state.userGroups.map((group) => `<option value="${escapeHTML(groupKey("user", group.id))}">${escapeHTML(group.name)}</option>`).join("")}</optgroup>`;
  filter.value = ["all", "custom", "learned", ...state.standardGroups.map((group) => groupKey("standard", group.id)), ...state.userGroups.map((group) => groupKey("user", group.id))].includes(selected) ? selected : "all";
  state.activeGroup = filter.value;

  const studySelect = $("#study-group");
  const previousStudyGroup = studySelect.value || state.studyGroup;
  studySelect.innerHTML = `<option value="all">Toàn bộ từ</option><option value="current">Nhóm đang xem</option><option value="custom">Từ tự thêm</option><optgroup label="Bài chuẩn">${state.standardGroups.map((group) => `<option value="${escapeHTML(groupKey("standard", group.id))}">${escapeHTML(group.name)}</option>`).join("")}</optgroup><optgroup label="Nhóm của tôi">${state.userGroups.map((group) => `<option value="${escapeHTML(groupKey("user", group.id))}">${escapeHTML(group.name)}</option>`).join("")}</optgroup>`;
  const validStudyGroups = ["all", "current", "custom", ...state.standardGroups.map((group) => groupKey("standard", group.id)), ...state.userGroups.map((group) => groupKey("user", group.id))];
  studySelect.value = validStudyGroups.includes(previousStudyGroup) ? previousStudyGroup : "all";
  state.studyGroup = studySelect.value;

  const target = $("#add-word-target");
  const previousTarget = target.value;
  target.innerHTML = `<option value="">Chọn nhóm cá nhân</option>${state.userGroups.map((group) => `<option value="${escapeHTML(group.id)}">${escapeHTML(group.name)}</option>`).join("")}`;
  const active = activeGroupInfo();
  target.value = state.userGroups.some((group) => group.id === previousTarget) ? previousTarget : (active.type === "user" ? active.group.id : "");
  syncTargetGroupPicker();

  const matches = state.userGroups.filter((group) => group.name.toLocaleLowerCase("vi").includes(groupSearch));
  $("#group-manager-list").innerHTML = matches.length ? matches.map((group) => `<div class="group-manager-row"><span class="group-dot"></span>${state.editingGroup === group.id ? `<input class="edit-group-input" data-group-name="${escapeHTML(group.id)}" value="${escapeHTML(group.name)}" maxlength="36" aria-label="Tên nhóm mới" /><button class="row-action" data-group-save="${escapeHTML(group.id)}">Lưu</button><button class="row-action" data-group-cancel="${escapeHTML(group.id)}">Hủy</button>` : `<strong>${escapeHTML(group.name)}</strong><span class="group-word-count">${groupWordCount(group.id)} từ</span><button class="row-action" data-group-edit="${escapeHTML(group.id)}" title="Đổi tên nhóm">Sửa</button><button class="row-action row-delete" data-group-delete="${escapeHTML(group.id)}" title="Xóa nhóm">Xóa</button>`}</div>`).join("") : `<p class="no-groups">${state.userGroups.length ? "Không tìm thấy nhóm phù hợp." : "Tạo nhóm riêng để gom từ trong thư viện hoặc thêm từ của bạn."}</p>`;
}

// renderWords(): render danh sách từ theo nhóm đang chọn, filter và source tag.
export function renderWords() {
  const query = state.query.trim().toLocaleLowerCase("vi");
  const filtered = visibleWords().filter(({ word }) => [word.traditional, word.zhuyin, word.pinyin, word.han_viet, word.meaning, word.example, word.usage_vi].join(" ").toLocaleLowerCase("vi").includes(query));
  const { type, group } = activeGroupInfo();
  const pageSize = 10;
  const shouldPaginate = type === "all" || type === "custom" || type === "learned";
  const pageCount = shouldPaginate ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  state.libraryPage = Math.min(Math.max(state.libraryPage, 1), pageCount);
  const pageStart = shouldPaginate ? (state.libraryPage - 1) * pageSize : 0;
  const visible = shouldPaginate ? filtered.slice(pageStart, pageStart + pageSize) : filtered;
  const heading = type === "standard" ? group.name : type === "user" ? group.name : type === "custom" ? "Từ tự thêm" : type === "learned" ? "Từ đã thuộc" : "Toàn bộ thư viện";
  $("#current-location").textContent = heading;
  $("#page-heading").textContent = heading;
  $("#page-subtitle").textContent = type === "user"
    ? "Từ thư viện đã thêm và từ vựng riêng trong nhóm này."
    : type === "standard"
      ? "Bài học chuẩn để tra cứu và thêm từ chưa thuộc vào nhóm cá nhân."
      : type === "custom"
        ? "Toàn bộ từ do bạn tự tạo, kể cả khi không còn thuộc nhóm nào."
        : type === "learned"
          ? "Các từ đã đánh dấu thuộc để tra cứu và ôn lại."
          : "Tra cứu từ trong thư viện chuẩn và từ riêng của bạn.";
  $("#result-count").textContent = `${filtered.length} từ`;
  $("#vocabulary-list").classList.toggle("hidden", filtered.length === 0);
  $("#empty-state").classList.toggle("hidden", filtered.length > 0);
  $("#empty-state").classList.toggle("empty-user-group", type === "user");
  $("#empty-state h3").textContent = type === "user" ? "Nhóm này chưa có từ" : type === "learned" ? "Chưa có từ đã thuộc" : "Không tìm thấy từ phù hợp";
  $("#empty-state p").textContent = type === "user" ? "Thêm từ của bạn hoặc tìm từ chưa thuộc trong thư viện." : type === "learned" ? "Các từ được đánh dấu Đã thuộc sẽ xuất hiện ở đây." : "Thử từ khóa khác hoặc chọn một bài học.";
  $("#empty-add-word").classList.toggle("hidden", type !== "user");
  $("#vocabulary-list").innerHTML = visible.map(({ word, source }) => {
    const groupName = source === "standard"
      ? state.standardGroups.find((item) => item.id === word.standard_group_id)?.name
      : source === "linked-standard"
        ? group?.name
        : type === "user"
          ? group?.name
          : userWordGroupNames(word.id).join(", ") || "Chưa có nhóm";
    const alreadyInGroup = type === "user" && source === "standard" && state.groupLinks.some((link) => link.group_id === group.id && link.vocabulary_id === word.id);
    const sourceLabel = source === "standard" ? "Bài chuẩn" : source === "linked-standard" ? "Từ thư viện" : "Từ của tôi";
    const statusButton = `<button type="button" class="status-tag ${word.learned ? "learned-tag" : "unlearned-tag"}" data-word-status="${escapeHTML(word.id)}" data-word-source="${source === "user" ? "user" : "standard"}">${word.learned ? "Đã thuộc" : "Chưa thuộc"}</button>`;
    const action = source === "user"
      ? type === "user"
        ? `<div class="word-actions"><button class="row-action" data-word-edit="${escapeHTML(word.id)}">Sửa</button><button class="row-action row-delete" data-user-link-remove="${escapeHTML(word.id)}" data-group-id="${escapeHTML(group.id)}">Bỏ khỏi nhóm</button><button class="row-action row-delete" data-word-delete="${escapeHTML(word.id)}">Xóa từ</button></div>`
        : `<div class="word-actions"><button class="row-action" data-word-edit="${escapeHTML(word.id)}">Sửa</button><button class="row-action row-delete" data-word-delete="${escapeHTML(word.id)}">Xóa từ</button></div>`
      : type === "user"
        ? `<div class="word-actions"><button class="row-action row-delete" data-link-remove="${escapeHTML(word.id)}" data-group-id="${escapeHTML(group.id)}">Bỏ khỏi nhóm</button></div>`
        : `<div class="word-actions"><button class="row-action ${alreadyInGroup ? "" : "row-add"}" data-library-add="${escapeHTML(word.id)}" ${word.learned ? "disabled title=\"Đã thuộc\"" : alreadyInGroup ? "disabled title=\"Đã có trong nhóm\"" : ""}>${word.learned ? "Đã thuộc" : alreadyInGroup ? "Đã thêm" : "+ Thêm vào nhóm"}</button></div>`;
    return `<article class="word-row ${source === "standard" ? "standard-word-row" : "user-word-row"}"><div class="word-character">${escapeHTML(word.traditional)}</div><div class="word-info"><div class="word-title-line"><strong>${escapeHTML(word.meaning)}</strong>${statusButton}<span class="source-tag">${sourceLabel}</span></div><span class="word-pinyin">${escapeHTML([word.zhuyin, word.pinyin].filter(Boolean).join(" · ") || "Chưa có phiên âm")}</span>${word.han_viet ? `<span class="word-example">Hán Việt: ${escapeHTML(word.han_viet)}</span>` : ""}${word.example ? `<span class="word-example">${escapeHTML(word.example)}</span>` : ""}</div><div class="word-group"><span class="group-pill">${escapeHTML(groupName || "")}</span></div>${action}</article>`;
  }).join("");
  const pagination = $("#vocabulary-pagination");
  pagination.classList.toggle("hidden", !shouldPaginate || filtered.length === 0);
  pagination.innerHTML = shouldPaginate && filtered.length > 0
    ? `<button type="button" data-library-page="first" ${state.libraryPage === 1 ? "disabled" : ""}>Trang đầu</button><button type="button" data-library-page="previous" ${state.libraryPage === 1 ? "disabled" : ""}>Trước</button><span aria-live="polite">Trang ${state.libraryPage} / ${pageCount}</span><button type="button" data-library-page="next" ${state.libraryPage === pageCount ? "disabled" : ""}>Sau</button><button type="button" data-library-page="last" ${state.libraryPage === pageCount ? "disabled" : ""}>Trang cuối</button>`
    : "";
}

// renderLibraryResults(): render kết quả tìm kiếm từ thư viện với tính năng lọc các từ chưa thuộc.
export function renderLibraryResults() {
  const query = $("#library-search-input").value.trim().toLocaleLowerCase("vi");
  const targetGroupId = $("#add-word-target").value;
  const linkedStandardIds = new Set(state.groupLinks.filter((link) => link.group_id === targetGroupId).map((link) => link.vocabulary_id));
  const linkedUserWordIds = new Set(state.userWordLinks.filter((link) => link.group_id === targetGroupId).map((link) => link.vocabulary_id));
  const personalMatches = state.userWords.filter((word) => !linkedUserWordIds.has(word.id)
    && [word.traditional, word.zhuyin, word.pinyin, word.han_viet, word.meaning, word.example, word.usage_vi].join(" ").toLocaleLowerCase("vi").includes(query)
  ).map((word) => ({ word, source: "user" }));
  const standardMatches = state.standardWords.filter((word) => !linkedStandardIds.has(word.id)
    && [word.traditional, word.zhuyin, word.pinyin, word.han_viet, word.meaning, word.example, word.usage_vi].join(" ").toLocaleLowerCase("vi").includes(query)
  ).map((word) => ({ word, source: "standard" }));
  const matches = [
    ...personalMatches,
    ...standardMatches,
  ].slice(0, 60);
  $("#library-results").innerHTML = matches.length ? matches.map(({ word, source }) => `<article class="library-result"><div class="word-character">${escapeHTML(word.traditional)}</div><div class="word-info"><strong>${escapeHTML(word.meaning)}</strong><span class="word-pinyin">${escapeHTML([word.zhuyin, word.pinyin].filter(Boolean).join(" · "))}</span><span class="source-tag">${source === "standard" ? "Thư viện chuẩn" : "Từ riêng"}</span><button type="button" class="status-tag ${word.learned ? "learned-tag" : "unlearned-tag"}" data-word-status="${escapeHTML(word.id)}" data-word-source="${source}">${word.learned ? "Đã thuộc" : "Chưa thuộc"}</button></div><button class="button button-outline button-small" type="button" data-library-add="${escapeHTML(word.id)}" data-library-source="${source}" ${word.learned ? "disabled" : ""}>${word.learned ? "Đã thuộc" : "Thêm vào nhóm"}</button></article>`).join("") : `<p class="no-groups">${query ? "Không tìm thấy từ phù hợp." : "Không còn từ phù hợp để thêm."}</p>`;
}

// openWordDialog(): mở dialog thêm/sửa từ; nếu mode là custom thì hiện form nhập tay, nếu library thì hiện tìm kiếm thư viện.
export function openWordDialog(word, targetGroupId, mode = "custom") {
  $("#word-form").reset();
  $("#word-id").value = word?.id || "";
  $("#word-dialog-title").textContent = word ? "Sửa từ riêng" : "Thêm từ vào nhóm";
  $("#word-traditional").value = word?.traditional || "";
  $("#word-zhuyin").value = word?.zhuyin || "";
  $("#word-pinyin").value = word?.pinyin || "";
  $("#word-han-viet").value = word?.han_viet || "";
  $("#word-meaning").value = word?.meaning || "";
  $("#word-usage").value = word?.usage_vi || "";
  $("#word-example").value = word?.example || "";
  $("#word-dialog").dataset.editing = word?.id || "";
  $("#add-word-target").value = state.userGroups.some((group) => group.id === targetGroupId) ? targetGroupId : "";
  syncTargetGroupPicker();
  $("#add-word-target-menu").classList.add("hidden");
  $("#add-word-target-trigger").setAttribute("aria-expanded", "false");
  $("#library-search-input").value = "";
  setWordMode(mode);
  renderLibraryResults();
  $("#word-dialog").showModal();
  if (mode === "custom") $("#word-traditional").focus();
  else $("#library-search-input").focus();
}

// setWordMode(): đổi chế độ thêm từ giữa 'custom' và 'library'.
export function setWordMode(mode) {
  state.wordMode = mode;
  $("#word-custom-fields").classList.toggle("hidden", mode !== "custom");
  $("#library-panel").classList.toggle("hidden", mode !== "library");
  document.querySelectorAll("[data-word-mode]").forEach((button) => {
    const active = button.dataset.wordMode === mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("#word-save").classList.toggle("hidden", mode !== "custom");
}

// studyWords(): lấy danh sách từ phù hợp với nhóm hiện tại để phục vụ chế độ flashcard.
export function studyWords() {
  let entries;
  if (state.studyGroup === "current") entries = visibleWords();
  else if (state.studyGroup === "custom") entries = state.userWords.map((word) => ({ word }));
  else if (state.studyGroup.startsWith("standard:")) {
    const groupId = state.studyGroup.slice(9);
    entries = state.standardWords.filter((word) => word.standard_group_id === groupId).map((word) => ({ word }));
  } else if (state.studyGroup.startsWith("user:")) {
    const groupId = state.studyGroup.slice(5);
    const linkedIds = new Set(state.groupLinks.filter((link) => link.group_id === groupId).map((link) => link.vocabulary_id));
    const customIds = new Set(state.userWordLinks.filter((link) => link.group_id === groupId).map((link) => link.vocabulary_id));
    entries = [
      ...state.standardWords.filter((word) => linkedIds.has(word.id)).map((word) => ({ word })),
      ...state.userWords.filter((word) => customIds.has(word.id)).map((word) => ({ word })),
    ];
  } else {
    entries = [...state.standardWords, ...state.userWords].map((word) => ({ word }));
  }
  const eligible = entries.map(({ word }) => word).filter((word) => !word.learned || word.id === state.studyRetainedId);
  if (state.studyDeck && state.studyDeckKey === state.studyGroup) return state.studyDeck;
  return eligible;
}

export function learnedWords() {
  return [...state.standardWords, ...state.userWords].filter((word) => word.learned);
}

// renderCard(): cập nhật nội dung và trạng thái của flashcard hiện tại khi lật thẻ hoặc chuyển thẻ.
// Mặt trước: chỉ hiển thị chữ Hán + gợi ý lật thẻ. Mặt sau: hiển thị nghĩa, Hán tự, âm Hán, zhuyin, pinyin và ví dụ.
export function renderCard() {
  const words = studyWords();
  if (state.studyIndex >= words.length) state.studyIndex = 0;
  const word = words[state.studyIndex];
  const cardSecondary = $("#card-secondary");
  const pinyinLine = word ? [word.zhuyin, word.pinyin].filter(Boolean).join(" · ") : "";

  $("#study-progress").textContent = words.length ? `${state.studyIndex + 1} / ${words.length}` : "0 / 0";
  $("#flashcard").classList.toggle("is-flipped", state.flipped);
  $("#flashcard").disabled = !word;
  $("#card-side-label").textContent = state.flipped ? "NGHĨA TIẾNG VIỆT" : "CHỮ PHỒN THỂ";
  $("#card-main").textContent = word ? (state.flipped ? word.meaning : word.traditional) : "Chưa có từ";

  if (state.flipped && word) {
    const zhuyin = word.zhuyin ? `<div class="card-back-detail card-back-zhuyin"><span class="card-detail-label">Zhuyin</span><span>${escapeHTML(word.zhuyin)}</span></div>` : "";
    const pinyin = word.pinyin ? `<div class="card-back-detail card-back-pinyin"><span class="card-detail-label">Pinyin</span><span>${escapeHTML(word.pinyin)}</span></div>` : "";
    const example = word.example ? `<div class="card-back-detail card-back-example"><span class="card-detail-label">Ví dụ</span><span class="card-example-text">${escapeHTML(word.example)}</span></div>` : "";
    const usage = word.usage_vi ? `<div class="card-back-detail card-back-extra"><span class="card-detail-label">Cách dùng</span><span class="card-extra-text">${escapeHTML(word.usage_vi)}</span></div>` : "";
    const hanParts = (word.traditional || "").split("").map((char, index) => {
      const hanViet = (word.han_viet || "").split(/\s+/)[index] || "";
      return `<div class="han-part-item"><span class="han-part-char">${escapeHTML(char)}</span><small>${escapeHTML(hanViet)}</small></div>`;
    }).join("");

    cardSecondary.innerHTML = `
      <div class="card-back-detail card-back-character">
        <span class="card-detail-label">Hán Tự, Âm Hán</span>
        <div class="han-part-grid">${hanParts || `<div class="han-part-item"><span class="han-part-char">—</span><small>—</small></div>`}</div>
      </div>
      ${zhuyin}
      ${pinyin}
    `;
  } else {
    cardSecondary.innerHTML = `<span class="card-front-hint">${word ? "Nhấn để lật thẻ" : "Chọn nhóm có từ để bắt đầu ôn tập"}</span>`;
  }

  cardSecondary.classList.toggle("is-flipped", state.flipped);
  cardSecondary.classList.toggle("is-empty", !word);
  $("#speak-word").disabled = !word;
  $("#mark-learned").disabled = !word;
  $("#study-prev").disabled = words.length < 2;
  $("#study-next").disabled = words.length < 2;
  $("#mark-learned").textContent = word?.learned ? "✓ Đã thuộc" : "✓ Đánh dấu đã thuộc";
  $("#mark-learned").classList.toggle("marked", Boolean(word?.learned));
}
