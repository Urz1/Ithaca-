export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  category: string;
  readTime: string;
  content: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "rendering-10000-nodes-at-60fps",
    title: "Rendering 10,000 Nodes at 60fps: A WebGL Journey",
    excerpt:
      "A deep dive into our Sigma.js implementation and how we optimized WebGL shaders and Web Workers for browser-based graph exploration.",
    author: "Ithaca Core Team",
    date: "Jan 05, 2026",
    category: "Engineering",
    readTime: "12 min read",
    content: `## The Challenge

When we set out to build Ithaca's citation graph, we knew we'd be dealing with large datasets. A typical research field has thousands of papers, each with dozens of citations. That's potentially tens of thousands of nodes and edges that need to render smoothly in the browser.

Most JavaScript graph libraries top out at a few hundred nodes before the frame rate tanks. We needed something fundamentally different.

## Why Sigma.js

We evaluated several options:

- **D3.js** — SVG-based, excellent for small graphs, but each node is a DOM element. At 1,000 nodes, the browser starts struggling.
- **vis.js** — Canvas-based, handles more nodes than D3, but the rendering pipeline isn't optimized for our use case.
- **Sigma.js v3** — WebGL-based, renders nodes and edges as GPU-instanced geometry. This is what we chose.

Sigma.js treats the graph like a game engine treats sprites: each node is a textured quad rendered in a single WebGL draw call. Instead of 10,000 individual draw calls (one per node), Sigma batches all nodes into a single instanced draw call.

## Custom Node Programs

The default Sigma node renderer draws circles. We needed more:

- **Size encoding** — node radius maps to citation count (log scale)
- **Color encoding** — cluster membership
- **Ring indicators** — selection state, controversy flags
- **Ghost transparency** — for suggested (unexplored) papers

We wrote custom WebGL node programs that pack all these visual properties into vertex attributes, computed once on the CPU and uploaded to the GPU in bulk.

## Edge Rendering

Edges were the harder problem. With 10,000 nodes, you can easily have 30,000+ edges. Our custom edge program:

1. Uses instanced rendering (one draw call for all edges)
2. Computes bezier curves in the vertex shader
3. Applies per-edge colors based on classification (green/red/blue)
4. Supports animated flow effects for hovered edges

## ForceAtlas2 in a Web Worker

The physics simulation (ForceAtlas2) runs in a separate Web Worker thread. This keeps the main thread free for rendering and user interaction. The worker sends position updates at 60fps, and Sigma applies them in its render loop.

Key optimization: we only run ForceAtlas2 for a fixed duration (5 seconds by default) after loading new data, then stop the simulation. This prevents CPU drain on laptops and lets the layout stabilize.

## Results

With these optimizations, we consistently hit 60fps with:
- Up to 10,000 nodes
- Up to 50,000 edges
- Full interactivity (hover, click, drag, zoom)
- Edge flow animations on hover

The GPU does the heavy lifting. The CPU is mostly idle after the initial layout stabilizes.`,
  },
  {
    slug: "beyond-citation-counts-epistemic-grounding",
    title: "Beyond Raw Citation Counts: Grounding Epistemic Stances with LLMs & OpenAlex",
    excerpt:
      "Why raw citation counts obscure scientific replication disputes, and how extracting in-text argument context transforms literature discovery.",
    author: "Ithaca Core Team",
    date: "Feb 14, 2026",
    category: "Methodology",
    readTime: "9 min read",
    content: `## The Bibliometric Illusion

For over half a century, the primary metric for academic influence has been raw citation count. A paper cited 2,000 times is automatically considered a foundational pillar of its field.

However, scientific history tells a much more nuanced story. Many papers with staggering citation counts achieve their prominence not because they established ground truth, but because they became the center of a replication dispute. When Twenge et al. (2018) published correlation analyses on adolescent screen time and well-being, the paper accumulated hundreds of citations from subsequent studies—many of which were dedicated solely to demonstrating that the effect size disappeared under rigorous specification curve analysis (Przybylski & Weinstein, 2019).

In standard search engines like Google Scholar or PubMed, both positive validations and devastating refutations increment the exact same citation counter. The dialectic nuance is completely flattened.

## Extracting the In-Text Dialectic

To construct a true epistemic graph, we must look beyond the bibliography list and read the actual sentences where one paper invokes another.

Through our partnership with Semantic Scholar and OpenAlex, Ithaca retrieves the target sentence containing the reference marker along with its immediate preceding and succeeding context:

\`\`\`
"...Although prior surveys suggested widespread behavioral disruption [Twenge et al., 2018], specification curve analysis of the same cohort indicates that the reported association is statistically indistinguishable from background noise..."
\`\`\`

When this excerpt is isolated, the relationship is unambiguous: this is not a casual background mention, nor is it a supportive replication. It is an explicit **Contradiction**.

## The Multi-Gate Classification Strategy

Language models are notoriously prone to hallucinatory confidence when asked open-ended questions. To ensure scientific rigor, Ithaca employs a multi-gate pipeline:

1. **Syntactic Context Filter**: We discard citations appearing strictly in introductory literature reviews unless they contain contrastive conjunctions (*however*, *contrary to*, *in contrast*).
2. **Few-Shot Dialectic Prompts**: The LLM is provided with calibrated academic examples across psychology, machine learning, and molecular biology.
3. **Conservative Confidence Thresholds**: If confidence falls below 0.65, or if only the abstract is accessible, the edge is preserved as Neutral / Background with an explicit provenance flag.

## Looking Forward

By mapping citations according to whether they support, contradict, or extend prior findings, we transition from bibliographic bookkeeping to genuine computational meta-science.`,
  },
  {
    slug: "designing-high-throughput-research-workspaces",
    title: "Designing High-Throughput Workspaces for Literature Synthesis",
    excerpt:
      "Balancing cognitive load in dense academic graphs: force-directed layouts, color semantics, and non-linear researcher exploration.",
    author: "Ithaca Core Team",
    date: "Feb 28, 2026",
    category: "Product Design",
    readTime: "8 min read",
    content: `## The Problem of Cognitive Overload in Network Visualizations

Anyone who has ever used Cytoscape or Gephi knows the dread of the "hairball effect": a tangled mass of thousands of interconnected lines where no structure is discernable and every interaction stutters.

When researchers sit down to conduct a comprehensive literature synthesis, they are already dealing with high cognitive load. A tool that adds visual noise or sluggish navigation quickly gets abandoned in favor of a plain notepad.

In designing Ithaca's canvas, we established three primary design constraints:

1. **Zero Unexplained Visuals**: Every node radius, border color, and edge curvature must encode a specific, verifiable scientific property.
2. **Progressive Level-of-Detail (LOD)**: Dense labels must never collide or occlude. As the camera zooms out, labels intelligently collapse into cluster centroids.
3. **Tactile Researcher Ergonomics**: The entire exploration workflow—from searching a seed paper to traversing its replication disputes—must be operable via keyboard shortcuts.

## Dialectic Color Semantics

Choosing colors for scientific argumentation requires extreme care:

- **Emerald (#10b981)** for **Supports**: Signals validation and methodological consensus without overwhelming surrounding nodes.
- **Rose (#f43f5e)** for **Contradicts**: Immediately draws the researcher's eye to points of active scientific friction. Controversies are where new discoveries happen.
- **Sky (#0ea5e9)** for **Extends**: Represents theoretical synthesis, domain adaptation, and generalization.

We rigorously tested these hues against both dark and light modes, ensuring WCAG AA contrast compliance and clear distinction for color-blind researchers.

## The Dual-Layer Canvas

Graph layouts are non-deterministic: force simulations can land in slightly different local minima depending on initial conditions. To provide orientation, Ithaca pairs the WebGL physics canvas with an instant Slide-Over Inspector.

Selecting any node freezes its immediate neighborhood, highlights incoming and outgoing dialectic edges, and displays verbatim evidence sentences in the sidebar. This allows researchers to switch between macro-topological overview and micro-textual verification in milliseconds.`,
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

