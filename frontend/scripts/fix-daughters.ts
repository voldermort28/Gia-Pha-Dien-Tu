import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Tìm kiếm tất cả người dùng (Nữ) có parent_families (là con đẻ ruột thịt)...");

    // Get all people
    const { data: people, error } = await supabase.from('people').select('*');
    if (error) {
        console.error("Lỗi:", error);
        return;
    }

    let fixedCount = 0;

    for (const p of people) {
        // A biological child has parent_families array with length > 0
        // If they are incorrectly marked as is_patrilineal = false (Ngoại tộc)
        if (p.parent_families && p.parent_families.length > 0 && p.is_patrilineal === false) {
            console.log(`- Cập nhật: ${p.display_name} (${p.handle}) -> Chính tộc`);
            const { error: updateError } = await supabase
                .from('people')
                .update({ is_patrilineal: true })
                .eq('handle', p.handle);

            if (updateError) {
                console.error(`  Lỗi khi cập nhật ${p.handle}:`, updateError);
            } else {
                fixedCount++;
            }
        }
    }

    console.log(`Đã sửa xong Dữ liệu! (Cập nhật ${fixedCount} thành viên)`);
}

run();
