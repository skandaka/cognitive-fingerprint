// Full(er) demo Isolation Forest (still simplified). Builds trees on subsamples, computes path length.
export interface AnomalyResult { score: number; threshold: number; isAnomaly: boolean; }

interface TreeNode { feature?: number; split?: number; left?: TreeNode; right?: TreeNode; size: number; depth: number; }

function buildTree(data: number[][], maxDepth: number, depth=0): TreeNode {
  const node: TreeNode = { size: data.length, depth };
  if (depth >= maxDepth || data.length <= 1) return node;
  const dim = data[0].length;
  // choose random feature and random split within feature range
  const feature = Math.floor(Math.random()*dim);
  const values = data.map(d=> d[feature]);
  const min = Math.min(...values), max = Math.max(...values);
  if (min === max) return node; // no split possible
  const split = Math.random()*(max-min) + min;
  const leftData: number[][] = []; const rightData: number[][] = [];
  data.forEach(d => (d[feature] < split? leftData:rightData).push(d));
  if (!leftData.length || !rightData.length) return node; // degenerate
  node.feature = feature; node.split = split;
  node.left = buildTree(leftData, maxDepth, depth+1);
  node.right = buildTree(rightData, maxDepth, depth+1);
  return node;
}

function pathLength(vec: number[], node: TreeNode): number {
  if (!node.feature || node.size <=1) return node.depth;
  const branch = vec[node.feature] < (node.split as number)? node.left: node.right;
  if (!branch) return node.depth;
  return pathLength(vec, branch);
}

export class IsolationForest {
  private trees: TreeNode[] = [];
  private maxDepth: number;
  constructor(private nTrees=50, private subSample=64){
    this.maxDepth = Math.ceil(Math.log2(this.subSample));
  }
  fit(dataset: number[][]){
    this.trees = [];
    for (let t=0; t<this.nTrees; t++) {
      // random subsample with replacement
      const sample: number[][] = [];
      for (let i=0;i<this.subSample;i++) sample.push(dataset[Math.floor(Math.random()*dataset.length)]);
      this.trees.push(buildTree(sample, this.maxDepth));
    }
  }
  score(vec: number[]): number {
    if (!this.trees.length) return 0;
    const paths = this.trees.map(tr => pathLength(vec, tr));
    const avgPath = paths.reduce((s,v)=>s+v,0)/paths.length;
    // anomaly score: shorter path -> higher anomaly
    return 1 - (avgPath / (this.maxDepth+1e-6));
  }
}

export function isolationForestScore(vector: number[]): AnomalyResult {
  // For now build ephemeral forest around the single vector with synthetic jittered samples
  const synth: number[][] = [];
  for (let i=0;i<200;i++) synth.push(vector.map(v => v + (Math.random()*0.2 - 0.1)));
  const forest = new IsolationForest();
  forest.fit(synth);
  const score = forest.score(vector);
  const threshold = 0.65;
  return { score, threshold, isAnomaly: score > threshold };
}
