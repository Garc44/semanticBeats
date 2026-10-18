import { writeFileSync } from 'node:fs';
import { buildKnowledgeGraph } from './knowledgeGraph.js';

const graph = buildKnowledgeGraph();
writeFileSync(new URL('./knowledgeGraph.json', import.meta.url), JSON.stringify(graph, null, 2) + '\n');
const count = t => graph.nodes.filter(n => n.type === t).length;
console.log(`nodes: subgenre ${count('subgenre')}, tempo ${count('tempo')}, pattern ${count('pattern')}, method ${count('method')}; edges ${graph.edges.length}`);
