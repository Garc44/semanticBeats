import { runSelectionStage } from './common.js';
import { retrieveGraph, rankWithGraph, graphContextText } from '../graph/graphRag.js';

const CATALOG_SIZE = 8; // same narrowing width as S3/S4

// S5 — S4 + GraphRAG: graph-reranked candidates and transitive genre/tempo/function context.
export const S5 = {
  id: 'S5',
  tagSource: 'ids',
  run: (prompt, opts) => runSelectionStage(prompt, opts, {
    planOptionsFor: (pillar, intent) => {
      const retrieval = retrieveGraph(prompt, intent);
      const ranked = rankWithGraph(pillar, retrieval, intent, CATALOG_SIZE);
      return { reasoning: true, catalogOverride: ranked, graphContext: graphContextText(retrieval, pillar, ranked) };
    },
  }),
};
