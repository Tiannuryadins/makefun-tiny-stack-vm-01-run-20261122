// Tiny stack VM (ISA v1) for make.fun tiny-stack-vm-01-run-20261122.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
function run(p, inp) {
  const mem = new Int32Array(256), s = [], c = [], o = [], n = p.length;
  let pc = 0, steps = 0, ip = 0;
  const end = (x) => ({ out: Buffer.from(o), code: x });
  while (true) {
    if (steps >= 1000000) return end(10);
    if (pc < 0 || pc >= n) return end(9);
    const op = p[pc];
    const il = op === 1 ? 1 : op === 2 ? 4 : op >= 0x30 && op <= 0x33 ? 2 : 0;
    if (pc + 1 + il > n) return end(9);
    steps++;
    const nx = pc + 1 + il;
    if (op >= 0x10 && op <= 0x22 && op !== 0x17 && op !== 0x1b && op !== 0x1f) {
      if (s.length < 2) return end(2);
      const b = s.pop(), a = s.pop();
      let r;
      if (op === 0x10) r = (a + b) | 0;
      else if (op === 0x11) r = (a - b) | 0;
      else if (op === 0x12) r = Math.imul(a, b);
      else if (op === 0x13) { if (!b) return end(4); r = Number(BigInt(a) / BigInt(b)) | 0; }
      else if (op === 0x14) { if (!b) return end(4); r = Number(BigInt(a) % BigInt(b)) | 0; }
      else if (op === 0x15) { if (!b) return end(4); r = Number(BigInt(a >>> 0) / BigInt(b >>> 0)) | 0; }
      else if (op === 0x16) { if (!b) return end(4); r = Number(BigInt(a >>> 0) % BigInt(b >>> 0)) | 0; }
      else if (op === 0x18) r = a & b;
      else if (op === 0x19) r = a | b;
      else if (op === 0x1a) r = a ^ b;
      else if (op === 0x1c) r = a << (b & 31);
      else if (op === 0x1d) r = a >> (b & 31);
      else if (op === 0x1e) r = (a >>> (b & 31)) | 0;
      else if (op === 0x20) r = a === b ? 1 : 0;
      else if (op === 0x21) r = a < b ? 1 : 0;
      else r = (a >>> 0) < (b >>> 0) ? 1 : 0;
      s.push(r); pc = nx; continue;
    }
    switch (op) {
      case 0: return end(0);
      case 1:
        if (s.length > 255) return end(3);
        s.push((p[pc + 1] << 24) >> 24); pc = nx; break;
      case 2:
        if (s.length > 255) return end(3);
        s.push(p[pc + 1] | p[pc + 2] << 8 | p[pc + 3] << 16 | p[pc + 4] << 24);
        pc = nx; break;
      case 3:
        if (!s.length) return end(2);
        s.pop(); pc = nx; break;
      case 4:
        if (!s.length) return end(2);
        if (s.length > 255) return end(3);
        s.push(s[s.length - 1]); pc = nx; break;
      case 5:
        if (s.length < 2) return end(2);
        { const t = s[s.length - 1]; s[s.length - 1] = s[s.length - 2]; s[s.length - 2] = t; }
        pc = nx; break;
      case 6:
        if (s.length < 2) return end(2);
        if (s.length > 255) return end(3);
        s.push(s[s.length - 2]); pc = nx; break;
      case 7:
        if (s.length < 3) return end(2);
        { const t = s[s.length - 3]; s[s.length - 3] = s[s.length - 2]; s[s.length - 2] = s[s.length - 1]; s[s.length - 1] = t; }
        pc = nx; break;
      case 0x17:
        if (!s.length) return end(2);
        s.push((-s.pop()) | 0); pc = nx; break;
      case 0x1b:
        if (!s.length) return end(2);
        s.push(~s.pop()); pc = nx; break;
      case 0x30: {
        let t = p[pc + 1] | p[pc + 2] << 8;
        if (t & 0x8000) t -= 0x10000;
        pc = nx + t; break;
      }
      case 0x31: case 0x32: {
        if (!s.length) return end(2);
        let t = p[pc + 1] | p[pc + 2] << 8;
        if (t & 0x8000) t -= 0x10000;
        const v = s.pop();
        pc = (op === 0x31 ? v === 0 : v !== 0) ? nx + t : nx; break;
      }
      case 0x33:
        if (c.length > 63) return end(7);
        c.push(nx); pc = p[pc + 1] | p[pc + 2] << 8; break;
      case 0x34:
        if (!c.length) return end(8);
        pc = c.pop(); break;
      case 0x40:
        if (!s.length) return end(2);
        { const a = s.pop();
          if (a < 0 || a > 255) return end(6);
          s.push(mem[a]); }
        pc = nx; break;
      case 0x41:
        if (s.length < 2) return end(2);
        { const a = s.pop(), v = s.pop();
          if (a < 0 || a > 255) return end(6);
          mem[a] = v; }
        pc = nx; break;
      case 0x50:
        if (!s.length) return end(2);
        { const t = String(s.pop());
          if (o.length + t.length > 65536) return end(11);
          for (let i = 0; i < t.length; i++) o.push(t.charCodeAt(i)); }
        pc = nx; break;
      case 0x51:
        if (!s.length) return end(2);
        if (o.length > 65535) return end(11);
        o.push(s.pop() & 255); pc = nx; break;
      case 0x52:
        if (s.length > 255) return end(3);
        s.push(ip < inp.length ? inp[ip++] : -1); pc = nx; break;
      case 0x53:
        if (!s.length) return end(2);
        return end(s.pop() & 255);
      default: return end(5);
    }
  }
}
for (const id of readdirSync(I).sort()) {
  const r = run(readFileSync(join(I, id, 'program.bin')), readFileSync(join(I, id, 'input.bin')));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), r.out);
  writeFileSync(join(O, id, 'exit.txt'), r.code + '\n');
}
