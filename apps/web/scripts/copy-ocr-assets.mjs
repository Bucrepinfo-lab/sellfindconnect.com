// Self-host the OCR engine (owner 25/11/26): copy Tesseract.js's worker, the
// LSTM engine builds and the compact English + Kiswahili models into
// public/ocr at build time, so "Read text from a photo" never loads code or
// data from a third-party CDN. Generated files; public/ocr is git-ignored.
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const dir = (pkg, from) => dirname(require.resolve(`${pkg}/package.json`, from ? { paths: [from] } : undefined));
const out = join(process.cwd(), "public", "ocr");
mkdirSync(join(out, "lang"), { recursive: true });

const tjs = dir("tesseract.js");
copyFileSync(join(tjs, "dist", "worker.min.js"), join(out, "worker.min.js"));
const core = dir("tesseract.js-core", tjs);
for (const f of ["tesseract-core-relaxedsimd-lstm", "tesseract-core-simd-lstm", "tesseract-core-lstm"]) {
  copyFileSync(join(core, `${f}.wasm.js`), join(out, `${f}.wasm.js`));
}
for (const lang of ["eng", "swa"]) {
  copyFileSync(join(dir(`@tesseract.js-data/${lang}`), "4.0.0_best_int", `${lang}.traineddata.gz`), join(out, "lang", `${lang}.traineddata.gz`));
}
console.log("OCR assets copied to public/ocr");
