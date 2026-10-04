// bootstrap.js
// Khởi tạo toàn bộ chức năng nghiệp vụ của app: auth, từ vựng, nhóm, flashcard, sự kiện chung.
import { connectSupabase, hasBackend } from "./core/data.js";
import { $, state } from "./core/state.js";
import { openApp } from "./core/session.js?v=20261003-group-picker";
import { configureAuth, initAuth } from "./features/auth.js";
import { initFlashcards } from "./features/flashcards.js?v=20261004-shuffle";
import { initGlobalInteractions } from "./features/global.js";
import { initGroups } from "./features/groups.js";
import { initVocabulary } from "./features/vocabulary.js?v=20261003-group-picker";

// startApp(): khởi chạy toàn bộ ứng dụng, bind sự kiện và đăng ký session nếu có backend.
export function startApp() {
  initAuth();
  initVocabulary();
  initGroups();
  initFlashcards();
  initGlobalInteractions();
  configureAuth(hasBackend);

  if (!hasBackend) return;
  connectSupabase().then(async () => {
    const { data } = await state.client.auth.getSession();
    if (data.session) openApp(data.session.user);
  }).catch((error) => {
    $("#auth-message").textContent = `Không kết nối được Supabase: ${error.message}`;
  });
}