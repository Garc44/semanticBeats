import { describe, it, expect, vi, afterAll } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runMatrix, readDoneKeys, runKey } from '../../eval/runner/core.js';
import { closeValidityWorker } from '../../eval/validity.js';

const llm = { calls: 1, promptTokens: 10, evalTokens: 5, llmMs: 3, outputs: ['raw'] };
const codeStage = { id: 'S0', tagSource: 'code', run: vi.fn(async () => ({ code: 's("bd*4").bank("RolandTR909")', selectedIds: null, intent: null, plans: [], llm })) };
const idStage = { id: 'S3', tagSource: 'ids', run: vi.fn(async () => ({ code: 's("bd*4").bank("RolandTR909")', selectedIds: ['basic_kick'], intent: { genre: 'techno' }, plans: [], llm })) };
const prompts = [
  { id: 'd01', category: 'direct_hit', text: 'techno kick', expected: ['kick', 'techno'] },
  { id: 'u01', category: 'underspecified', text: 'make it slap', expected: ['driving'] },
];
afterAll(() => closeValidityWorker());
const readLines = p => readFileSync(p, 'utf8').trim().split('\n').map(l => JSON.parse(l));
const tmp = () => join(mkdtempSync(join(tmpdir(), 'run-')), 'run.jsonl');
const base = { prompts, reps: 2, seedBase: 1000, temperature: 0.7, maxConsecutiveCrashes: 3, log: () => {} };

describe('runMatrix', () => {
  it('writes stages × prompts × reps records with seeds, tags and timing', async () => {
    const outPath = tmp();
    const res = await runMatrix({ ...base, stages: [codeStage, idStage], outPath });
    expect(res).toEqual({ written: 8, skipped: 0, crashed: 0 });
    const recs = readLines(outPath);
    expect(recs).toHaveLength(8);
    expect(new Set(recs.map(r => r.seed))).toEqual(new Set([1000, 1001]));
    const s0 = recs.find(r => r.stage === 'S0');
    expect(s0).toMatchObject({ schema: 1, errorClass: null, executes: true, temperature: 0.7, llm: { calls: 1, promptTokens: 10, evalTokens: 5, llmMs: 3 } });
    expect(s0.tags).toEqual(expect.arrayContaining(['kick', 'techno']));
    expect(s0.tags).toEqual(s0.tagsFromCode);
    const s3 = recs.find(r => r.stage === 'S3');
    expect(s3.tags).toEqual(['kick', 'techno']);
    expect(typeof s3.latencyMs).toBe('number');
    expect(recs.slice(0, 2).map(r => r.stage)).toEqual(['S0', 'S3']);
  });

  it('resumes: finished keys are skipped', async () => {
    const outPath = tmp();
    await runMatrix({ ...base, stages: [codeStage], outPath });
    codeStage.run.mockClear();
    const res = await runMatrix({ ...base, stages: [codeStage], outPath });
    expect(res).toEqual({ written: 0, skipped: 4, crashed: 0 });
    expect(codeStage.run).not.toHaveBeenCalled();
  });

  // Review Focus 5
  it('tolerates a partial trailing line from an interrupted run', async () => {
    const outPath = tmp();
    await runMatrix({ ...base, reps: 1, stages: [codeStage], outPath });
    writeFileSync(outPath, readFileSync(outPath, 'utf8') + '{"stage":"S0","promptId":"u0', { flag: 'w' });
    expect(readDoneKeys(outPath).size).toBe(2);
  });

  // Review Focus 4
  it('crashes go to .errors.jsonl, are retried on resume, and abort after N in a row', async () => {
    const outPath = tmp();
    const dead = { id: 'S1', tagSource: 'code', run: vi.fn(async () => { throw new Error('fetch failed'); }) };
    await expect(runMatrix({ ...base, stages: [dead], outPath })).rejects.toThrow(/3 consecutive crashes/);
    expect(existsSync(outPath) ? readFileSync(outPath, 'utf8').trim() : '').toBe('');
    expect(readLines(`${outPath}.errors.jsonl`)).toHaveLength(3);
    expect(readDoneKeys(outPath).size).toBe(0);
  });

  it('records invalid code with its error class', async () => {
    const outPath = tmp();
    const broken = { id: 'S0', tagSource: 'code', run: async () => ({ code: 's("bd".fast(', selectedIds: null, intent: null, plans: [], llm }) };
    await runMatrix({ ...base, reps: 1, prompts: prompts.slice(0, 1), stages: [broken], outPath });
    const [rec] = readLines(outPath);
    expect(rec).toMatchObject({ errorClass: 'syntax', executes: false, tags: [], tagsFromCode: [] });
  });

  it('runKey', () => expect(runKey({ stage: 'S0', promptId: 'd01', rep: 3 })).toBe('S0|d01|3'));
});
