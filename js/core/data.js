// data.js
// Layer dữ liệu của app: đọc dữ liệu demo, đọc từ Supabase, refresh state, lưu dữ liệu ứng với từng table.
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../../config.js";
import { state } from "./state.js";

const demoKey = "taiwanapp-demo-v1";
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const lessonNames = [
  "歡迎你來臺灣！", "我的家人", "週末做什麼？", "請問一共多少錢？", "牛肉麵真好吃",
  "他們學校在山上", "早上九點去KTV", "坐火車去臺南", "放假去哪裡玩？",
  "臺灣的水果很好吃", "我要租房子", "你在臺灣學多久的中文？", "生日快樂",
  "天氣這麼冷！", "我很不舒服",
];

export const hasBackend = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// seedDemo(): tạo dữ liệu mẫu mặc định cho chế độ dùng thử không cần tài khoản.
function seedDemo() {
  const standardGroups = lessonNames.map((name, index) => ({ id: `demo-lesson-${index + 1}`, lesson_number: index + 1, name: `Bài ${String(index + 1).padStart(2, "0")} - ${name}` }));
  const group = (lesson) => standardGroups[lesson - 1];
  return {
    standardGroups,
    standardWords: [
      { id: "demo-standard-1", standard_group_id: group(1).id, traditional: "你好", zhuyin: "ㄋㄧˇ ㄏㄠˇ", pinyin: "nǐ hǎo", han_viet: "Nhĩ hảo", meaning: "xin chào; chào bạn", example: "你好，很高興認識你。", is_published: true },
      { id: "demo-standard-2", standard_group_id: group(1).id, traditional: "謝謝", zhuyin: "ㄒㄧㄝˋ ˙ㄒㄧㄝ", pinyin: "xièxie", han_viet: "Tạ tạ", meaning: "cảm ơn", example: "謝謝你的幫忙。", is_published: true },
      { id: "demo-standard-3", standard_group_id: group(8).id, traditional: "捷運", zhuyin: "ㄐㄧㄝˊ ㄩㄣˋ", pinyin: "jiéyùn", han_viet: "Tiệp vận", meaning: "MRT; tàu điện đô thị", example: "我坐捷運去台北車站。", is_published: true },
      { id: "demo-standard-4", standard_group_id: group(5).id, traditional: "好吃", zhuyin: "ㄏㄠˇ ㄔ", pinyin: "hǎochī", han_viet: "Hảo cật", meaning: "ngon; ngon miệng (đồ ăn)", example: "這家店的牛肉麵很好吃。", is_published: true },
    ],
    userGroups: [],
    userWords: [],
    userWordLinks: [],
    groupLinks: [],
    progress: [],
  };
}

// readDemo(): đọc dữ liệu demo từ localStorage; nếu corrupt thì khởi tạo lại workspace demo.
function readDemo() {
  try {
    const saved = JSON.parse(localStorage.getItem(demoKey));
    if (saved && Array.isArray(saved.standardGroups) && Array.isArray(saved.standardWords)) {
      saved.progress = Array.isArray(saved.progress) ? saved.progress : [];
      saved.userWords = Array.isArray(saved.userWords) ? saved.userWords : [];
      saved.userGroups = Array.isArray(saved.userGroups) ? saved.userGroups : [];
      saved.groupLinks = Array.isArray(saved.groupLinks) ? saved.groupLinks : [];
      if (!Array.isArray(saved.userWordLinks)) {
        saved.userWordLinks = (saved.userWords || []).filter((word) => word.group_id).map((word) => ({
          group_id: word.group_id,
          vocabulary_id: word.id,
        }));
      }
      saved.userWordLinks = Array.isArray(saved.userWordLinks) ? saved.userWordLinks : [];
      (saved.userWords || []).forEach((word) => { word.group_id = null; });
      return saved;
    }
    if (saved && Array.isArray(saved.groups) && Array.isArray(saved.words)) {
      const migrated = seedDemo();
      migrated.userGroups = saved.groups.map((group) => ({ ...group, legacy_group_id: group.id }));
      migrated.userWords = saved.words.map((word) => ({ ...word, legacy_vocabulary_id: word.id }));
      migrated.userWordLinks = migrated.userWords.filter((word) => word.group_id).map((word) => ({
        group_id: word.group_id,
        vocabulary_id: word.id,
      }));
      migrated.userWords.forEach((word) => { word.group_id = null; });
      localStorage.setItem(demoKey, JSON.stringify(migrated));
      return migrated;
    }
  } catch { /* Start a fresh demo workspace if saved data is unreadable. */ }
  return seedDemo();
}

// saveDemo(): lưu dữ liệu demo sau mỗi thay đổi để UI vẫn giữ trạng thái trên thiết bị.
function saveDemo() {
  localStorage.setItem(demoKey, JSON.stringify({
    standardGroups: state.standardGroups,
    standardWords: state.standardWords,
    userGroups: state.userGroups,
    userWords: state.userWords,
    userWordLinks: state.userWordLinks,
    groupLinks: state.groupLinks,
    progress: state.progress,
  }));
}

// connectSupabase(): tạo client Supabase nếu app có URL/key backend.
export async function connectSupabase() {
  if (!hasBackend) return;
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  state.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// refreshData(): đọc lại toàn bộ dữ liệu từ demo hoặc Supabase và gán vào state.
export async function refreshData() {
  let data;
  if (state.demo) {
    data = readDemo();
  } else {
    const results = await Promise.all([
      state.client.from("standard_vocabulary_groups").select("id,lesson_number,name").order("lesson_number"),
      state.client.from("standard_vocabulary").select("id,standard_group_id,traditional,zhuyin,pinyin,han_viet,meaning,part_of_speech,usage_vi,example,review_status,is_published").eq("is_published", true).order("traditional"),
      state.client.from("user_groups").select("id,user_id,name,created_at,legacy_group_id").order("created_at"),
      state.client.from("user_vocabulary").select("id,user_id,group_id,traditional,zhuyin,pinyin,han_viet,meaning,part_of_speech,usage_vi,example,learned,created_at").order("created_at", { ascending: false }),
      state.client.from("user_group_vocabulary").select("group_id,vocabulary_id,user_id"),
      state.client.from("user_group_user_vocabulary").select("group_id,vocabulary_id,user_id"),
      state.client.from("user_word_progress").select("vocabulary_id,learned,user_id"),
    ]);
    const error = results.find((result) => result.error)?.error;
    if (error) throw error;
    data = {
      standardGroups: results[0].data,
      standardWords: results[1].data,
      userGroups: results[2].data,
      userWords: results[3].data,
      groupLinks: results[4].data,
      userWordLinks: results[5].data,
      progress: results[6].data,
    };
  }
  state.standardGroups = data.standardGroups;
  state.progress = Array.isArray(data.progress) ? data.progress : [];
  state.standardWords = data.standardWords.map((word) => ({
    ...word,
    learned: state.progress.some((progress) => progress.vocabulary_id === word.id && progress.learned),
  }));
  state.userGroups = data.userGroups;
  state.userWords = data.userWords;
  state.userWordLinks = data.userWordLinks ?? data.userWords.filter((word) => word.group_id).map((word) => ({
    group_id: word.group_id,
    vocabulary_id: word.id,
  }));
  state.groupLinks = data.groupLinks;
}

// persist(): lưu/insert/update/delete dữ liệu theo table và operation, hỗ trợ cả demo localStorage và Supabase.
export async function persist(table, operation, payload, rowId) {
  const tableState = {
    user_groups: state.userGroups,
    user_vocabulary: state.userWords,
    user_group_vocabulary: state.groupLinks,
    user_group_user_vocabulary: state.userWordLinks,
  };
  if (state.demo) {
    const rows = tableState[table];
    if (table === "user_word_progress" && operation === "upsert") {
      const progress = state.progress.find((row) => row.vocabulary_id === payload.vocabulary_id);
      if (progress) progress.learned = payload.learned;
      else state.progress.push(payload);
      const word = state.standardWords.find((item) => item.id === payload.vocabulary_id);
      if (word) word.learned = payload.learned;
      saveDemo();
      return;
    }
    if (!rows) throw new Error("Bảng dữ liệu demo không hợp lệ.");
    let insertedId;
    if (operation === "insert") {
      if (table === "user_group_vocabulary" || table === "user_group_user_vocabulary") {
        if (!rows.some((row) => row.group_id === payload.group_id && row.vocabulary_id === payload.vocabulary_id)) rows.push(payload);
      } else {
        const inserted = { id: id(), ...payload };
        rows.unshift(inserted);
        if (table === "user_vocabulary") insertedId = inserted.id;
      }
    }
    if (operation === "update") Object.assign(rows.find((row) => row.id === rowId), payload);
    if (operation === "delete") {
      const index = rows.findIndex((row) => table === "user_group_vocabulary" || table === "user_group_user_vocabulary"
        ? row.group_id === payload.group_id && row.vocabulary_id === payload.vocabulary_id
        : row.id === rowId);
      if (index >= 0) rows.splice(index, 1);
      if (table === "user_groups") {
        state.groupLinks = state.groupLinks.filter((link) => link.group_id !== rowId);
        state.userWordLinks = state.userWordLinks.filter((link) => link.group_id !== rowId);
      }
      if (table === "user_vocabulary") {
        state.userWordLinks = state.userWordLinks.filter((link) => link.vocabulary_id !== rowId);
      }
    }
    saveDemo();
    return insertedId;
  }
  let request = state.client.from(table);
  if (operation === "insert") {
    request = request.insert({ ...payload, user_id: state.user.id });
    if (table === "user_vocabulary") request = request.select("id").single();
  }
  if (operation === "upsert") request = request.upsert({ ...payload, user_id: state.user.id }, { onConflict: "user_id,vocabulary_id" });
  if (operation === "update") request = request.update(payload).eq("id", rowId);
  if (operation === "delete") {
    request = request.delete();
    if (table === "user_group_vocabulary" || table === "user_group_user_vocabulary") request = request.eq("group_id", payload.group_id).eq("vocabulary_id", payload.vocabulary_id);
    else request = request.eq("id", rowId);
  }
  const { data, error } = await request;
  if (error?.code === "23505") {
    throw new Error(table === "user_groups" ? "Tên nhóm này đã tồn tại." : "Từ vựng này đã có trong sổ của bạn.");
  }
  if (error) throw error;
  return table === "user_vocabulary" && operation === "insert" ? data.id : undefined;
}