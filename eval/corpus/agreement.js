// Binary decision per (prompt, vocabulary tag): did the annotator assign it?
export function cohensKappa(a, b, ids, vocab) {
  let agree = 0, aYes = 0, bYes = 0, n = 0;
  for (const id of ids) {
    const A = new Set(a[id] ?? []);
    const B = new Set(b[id] ?? []);
    for (const t of vocab) {
      const x = A.has(t), y = B.has(t);
      if (x === y) agree++;
      if (x) aYes++;
      if (y) bYes++;
      n++;
    }
  }
  const po = agree / n;
  const pe = (aYes / n) * (bYes / n) + (1 - aYes / n) * (1 - bYes / n);
  if (pe === 1) return po === 1 ? 1 : 0;
  return (po - pe) / (1 - pe);
}

export function meanJaccard(a, b, ids) {
  const scores = ids.map(id => {
    const A = new Set(a[id] ?? []);
    const B = new Set(b[id] ?? []);
    const union = new Set([...A, ...B]);
    if (!union.size) return 1;
    return [...A].filter(t => B.has(t)).length / union.size;
  });
  return scores.reduce((s, x) => s + x, 0) / scores.length;
}
