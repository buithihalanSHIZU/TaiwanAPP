// flashcards.js
// Quản lý phiên ôn flashcard: flip thẻ, vuốt chuyển thẻ, đánh dấu đã thuộc, đổi nhóm ôn tập.
import { $, notify, state } from "../core/state.js";
import { persist } from "../core/data.js";
import { runAction } from "../core/session.js";
import { openStudy, renderCard, studyWords } from "../ui/render.js";

// initFlashcards(): bind các event của flashcard và các nút điều hướng trong dialog ôn tập.
export function initFlashcards() {
  const card = $("#flashcard");
  const SWIPE_THRESHOLD = 50; // Khoảng cách vuốt tối thiểu, đơn vị px
  const TAP_THRESHOLD = 10;   // Cho phép ngón tay xê dịch nhẹ khi chạm

  let gesture = null;
  let dragged = false;

  function speakWord() {
    const word = studyWords()[state.studyIndex];
    if (!word) return;
    if (!("speechSynthesis" in window)) return notify("Thiết bị không hỗ trợ đọc giọng nói.");
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(word.traditional);
    const voices = synth.getVoices();
    const taiwanVoice = voices.find(
      (voice) => voice.lang.toLowerCase() === "zh-tw"
    );

    utterance.lang = "zh-TW";
    utterance.voice = taiwanVoice || null;
    utterance.rate = 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    synth.cancel();
    synth.speak(utterance);
  }

  // changeCard(): chuyển sang thẻ trước/sau theo hướng và reset trạng thái flip.
  function changeCard(direction) {
    const count = studyWords().length;
    if (!count) return;

    state.studyIndex =
      (state.studyIndex + direction + count) % count;

    state.flipped = false;
    renderCard();
  }

  // isControl(): bỏ qua swipe/click khi người dùng đang tương tác với button/input bên trong card.
  function isControl(target) {
    const control = target.closest(
      "button, a, input, select, textarea, [contenteditable], [data-no-swipe]"
    );

    return control && control !== card;
  }

  $("#study-open").addEventListener("click", openStudy);
  $("#study-cta").addEventListener("click", openStudy);

  // Bắt đầu chạm hoặc kéo chuột.
  card.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary || event.button !== 0) return;

    dragged = false;
    if (isControl(event.target)) return;

    gesture = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };

    // Tiếp tục nhận sự kiện khi kéo ra ngoài phạm vi thẻ.
    card.setPointerCapture(event.pointerId);
  });

  // Phân biệt thao tác kéo với chạm nhẹ.
  card.addEventListener("pointermove", (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;

    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;

    if (Math.hypot(dx, dy) > TAP_THRESHOLD) {
      dragged = true;
    }
  });

  // Thả tay/chuột: kiểm tra có đủ điều kiện chuyển thẻ không.
  card.addEventListener("pointerup", (event) => {
    if (!gesture || gesture.id !== event.pointerId) return;

    const dx = event.clientX - gesture.x;
    const dy = event.clientY - gesture.y;

    gesture = null;

    if (Math.hypot(dx, dy) > TAP_THRESHOLD) {
      dragged = true;
    }

    if (card.hasPointerCapture(event.pointerId)) {
      card.releasePointerCapture(event.pointerId);
    }

    // Chỉ chuyển khi vuốt ngang đủ xa và rõ hơn hướng dọc.
    const isHorizontalSwipe =
      Math.abs(dx) >= SWIPE_THRESHOLD &&
      Math.abs(dx) > Math.abs(dy) * 1.2;

    if (isHorizontalSwipe) {
      changeCard(dx < 0 ? 1 : -1);
    }
  });

  // Hủy thao tác khi trình duyệt chuyển sang cuộn trang/phóng to.
  function cancelGesture(event) {
    if (!gesture || gesture.id !== event.pointerId) return;

    gesture = null;
    dragged = true;
  }

  card.addEventListener("pointercancel", cancelGesture);
  card.addEventListener("lostpointercapture", cancelGesture);

  card.addEventListener("click", (event) => {
    // Chặn click phát sinh sau thao tác kéo, tránh lật nhầm thẻ mới.
    // detail = 0 vẫn cho phép kích hoạt bằng bàn phím.
    if (dragged && event.detail > 0) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (isControl(event.target)) return;

    state.flipped = !state.flipped;
    renderCard();
  }, true);

  $("#study-group").addEventListener("change", (event) => {
    state.studyGroup = event.target.value;
    state.studyIndex = 0;
    state.flipped = false;
    renderCard();
  });

  $("#study-next").addEventListener("click", () => changeCard(1));
  $("#study-prev").addEventListener("click", () => changeCard(-1));
  $("#speak-word").addEventListener("click", speakWord);

  $("#mark-learned").addEventListener("click", () => {
    const word = studyWords()[state.studyIndex];
    if (!word) return;

    const isStandardWord = state.standardWords.some(
      (item) => item.id === word.id
    );

    runAction(
      () => isStandardWord
        ? persist("user_word_progress", "upsert", {
            vocabulary_id: word.id,
            learned: !word.learned,
          })
        : persist(
            "user_vocabulary",
            "update",
            { learned: !word.learned },
            word.id
          ),
      word.learned
        ? "Đã bỏ đánh dấu."
        : "Đã đánh dấu từ đã thuộc.",
    );
  });
}