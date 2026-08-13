import bcrypt from 'bcrypt';
console.log(await bcrypt.hash('admin123', 10));