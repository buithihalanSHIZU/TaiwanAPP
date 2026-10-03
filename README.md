# Từ Đài Loan

Ứng dụng web học tiếng Đài Loan bằng flashcard. 15 bài chuẩn là thư viện chỉ đọc; mỗi user có tiến độ học, nhóm riêng, có thể thêm từ riêng hoặc tìm từ chuẩn/từ riêng đã có để liên kết vào nhiều nhóm mà không tạo bản ghi trùng.

## Cấu trúc mã nguồn

- `index.html`: khung trang và điểm nạp ứng dụng.
- `views/`: HTML riêng cho đăng nhập, workspace, từ vựng, nhóm và flashcard.
- `js/app.js`: tải các HTML partial.
- `js/bootstrap.js`: khởi tạo các feature sau khi giao diện đã nạp.
- `js/core/`: state, dữ liệu Supabase/demo và session/actions.
- `js/features/`: handlers riêng cho đăng nhập, từ vựng, nhóm, flashcard và tương tác chung.
- `js/ui/render.js`: dựng danh sách, nhóm và nội dung flashcard.
- `styles.css`: style dùng chung cho toàn bộ giao diện.

## Chạy thử

Mở terminal tại thư mục dự án và chạy:

```sh
python3 -m http.server 4173
```

Mở http://localhost:4173. Chọn **Dùng thử không cần tài khoản** để trải nghiệm; dữ liệu demo được lưu trên trình duyệt hiện tại.

## Supabase: Schema Và Di Chuyển

Schema mới giữ các bảng `vocabulary*` cũ làm nguồn/rollback, đồng thời tạo catalog chuẩn, nhóm riêng, từ riêng, tiến độ và liên kết nhóm. Không có lệnh `DROP`.

`user_group_user_vocabulary` liên kết một từ riêng với nhiều nhóm. `schema.sql` tạo bảng này và sao chép các liên kết cũ từ `user_vocabulary.group_id`. Nếu chỉ cần áp dụng thay đổi này cho database đang chạy, có thể chạy `supabase/migrate_user_vocabulary_groups.sql` trước khi dùng phiên bản app mới.

### Database đang có dữ liệu

1. Sao lưu database trước khi thay đổi.
2. Chạy toàn bộ `supabase/schema.sql` trong Supabase SQL Editor. Bảng cũ được giữ; bảng catalog và bảng riêng mới được thêm.
3. Không chạy lại file import nếu 15 nhóm và 567 từ đã có. File import đặt các mục là `draft` và có thể cập nhật nội dung khi chạy lại.
4. Mở `supabase/migrate_legacy_to_library.sql`, kiểm tra `v_source_email` ở đầu file, rồi chạy. Migration kiểm tra 15 nhóm và 567 từ, sao chép cả ký tự, ví dụ, quan hệ, tiến độ của tài khoản nguồn; bảng cũ không bị xóa.
5. Tạo admin đầu tiên trong SQL Editor bằng UUID user đã đăng ký:

```sql
insert into public.admins (user_id, admin_role)
select id, 'super_admin'
from auth.users
where email = 'your-email@example.com'
on conflict (user_id) do update set admin_role = 'super_admin';
```

Các từ có `review_status = 'checked'` được publish khi migrate. Từ `draft` vẫn ẩn với user thường; admin có thể publish sau khi kiểm tra:

```sql
update public.standard_vocabulary
set is_published = true, updated_at = now()
where standard_group_id = 'GROUP_UUID_HERE';
```

Kiểm tra số lượng trước khi dùng app mới:

```sql
select count(*) from public.standard_vocabulary_groups;
select count(*) from public.standard_vocabulary;
select count(*) from public.user_groups;
select count(*) from public.user_vocabulary;
```

### Project Supabase mới

1. Chạy `supabase/schema.sql`.
2. Tạo tài khoản nguồn trong Supabase Auth.
3. Chạy file import hiện có `import_grammar_taiwan_to_supabase.sql` để nạp vào bảng legacy.
4. Chạy `supabase/migrate_legacy_to_library.sql` với email tài khoản nguồn đúng.
5. Tạo super admin theo câu lệnh ở trên.

`supabase/duplicate_prevention.sql` chỉ cần chạy riêng nếu các unique index cho `user_groups` và `user_vocabulary` chưa được tạo. Catalog chuẩn cho phép cùng chữ Hán có nhiều nghĩa; chống trùng không áp dụng vào thư viện đó.

Sao chép Project URL và Publishable/anon key vào `config.js`. Không dùng service-role key trong app. Catalog chuẩn chỉ đọc; nhóm, từ riêng, liên kết và tiến độ được giới hạn theo user bằng RLS. Chế độ demo lưu dữ liệu cục bộ, không phải tài khoản cloud.