import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const email = 'davipiano@gmail.com';
const password = 'davipiano';

async function diagnose() {
    const url = process.env.SUPABASE_OWNER_URL;
    const key = process.env.SUPABASE_OWNER_SERVICE_KEY || process.env.SUPABASE_OWNER_KEY;

    if (!url || !key) {
        console.error('❌ Supabase credentials missing');
        return;
    }

    console.log(`🔗 Connecting to: ${url}`);
    const supabase = createClient(url, key);

    console.log(`🔍 Searching for user: ${email}`);
    const { data: users, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error('❌ Supabase error:', error.message);
        return;
    }

    if (!users || users.length === 0) {
        console.error('❌ User not found in admin_users table');

        // Check all users to see what's there
        const { data: allUsers } = await supabase.from('admin_users').select('email').limit(5);
        console.log('📝 Sample users in DB:', allUsers?.map(u => u.email).join(', ') || 'None');
        return;
    }

    const user = users[0];
    console.log('✅ User found!');
    console.log(`ℹ️ Name: ${user.name}`);
    console.log(`ℹ️ Role: ${user.role}`);
    console.log(`ℹ️ Status: ${user.is_active ? 'Active' : 'Inactive'}`);

    console.log('🧪 Verifying password...');
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (isValid) {
        console.log('✅ Password is VALID');
    } else {
        console.error('❌ Password is INVALID');
        console.log(`💡 DB Hash: ${user.password_hash}`);
    }
}

diagnose();
