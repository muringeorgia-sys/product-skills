// Текст слайдов и заметок .pptx в порядке показа — для ревью.
//   node deck_text.mjs <deck.pptx> > slides.txt
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const deck = process.argv[2];
if (!deck || !fs.existsSync(deck)) { console.error("node deck_text.mjs <deck.pptx>"); process.exit(1); }
const tar = process.platform === "win32" ? path.join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe") : "tar";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deck-"));
execFileSync(tar, ["-xf", path.resolve(deck), "-C", tmp]);
const read = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : "");
const text = (xml) => [...xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>/g)]
  .map((p) => [...p[1].matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(""))
  .filter(Boolean).join("\n");
const pres = read(path.join(tmp, "ppt", "presentation.xml"));
const rels = read(path.join(tmp, "ppt", "_rels", "presentation.xml.rels"));
const map = Object.fromEntries([...rels.matchAll(/Id="(rId\d+)"[^>]*Target="slides\/(slide\d+\.xml)"/g)].map((m) => [m[1], m[2]]));
const order = [...pres.matchAll(/<p:sldId [^>]*r:id="(rId\d+)"/g)].map((m) => map[m[1]]);
const out = [];
order.forEach((file, i) => {
  const n = file.match(/\d+/)[0];
  out.push(`===== Слайд ${i + 1} =====`, text(read(path.join(tmp, "ppt", "slides", file))));
  const notes = text(read(path.join(tmp, "ppt", "notesSlides", `notesSlide${n}.xml`)));
  if (notes) out.push("--- заметки ---", notes);
});
fs.rmSync(tmp, { recursive: true, force: true });
process.stdout.write(out.join("\n") + "\n");
