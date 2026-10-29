// Vercel дээр зөвхөн public/ хавтас үйлчлэгдэнэ — GSAP-ийг node_modules-оос public/vendor/gsap руу хуулна.
const fs = require('fs');
const path = require('path');

const FILES = ['gsap.min.js', 'DrawSVGPlugin.min.js', 'MotionPathPlugin.min.js', 'Physics2DPlugin.min.js', 'EasePack.min.js'];
const from = path.join(__dirname, '..', 'node_modules', 'gsap', 'dist');
const to = path.join(__dirname, '..', 'public', 'vendor', 'gsap');

fs.mkdirSync(to, { recursive: true });
for (const f of FILES) fs.copyFileSync(path.join(from, f), path.join(to, f));
console.log(`GSAP: ${FILES.length} файл public/vendor/gsap руу хуулагдлаа`);
