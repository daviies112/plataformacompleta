import bcrypt from 'bcryptjs';

const password = 'davipiano';
const hash = '$2a$06$qULzKAigQUu5rmg8OU2DteIaEaCnvgW8M6SnLLAXLz4ZSSfiAuPKC';

async function check() {
    const isValid = await bcrypt.compare(password, hash);
    console.log(`Password: ${password}`);
    console.log(`Hash: ${hash}`);
    console.log(`Is Valid: ${isValid}`);
}

check();
