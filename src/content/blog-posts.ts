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
      "A deep dive into our Sigma.js implementation and how we optimized WebGL shaders for the browser.",
    author: "Dev Team",
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
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
