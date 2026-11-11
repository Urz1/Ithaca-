#!/usr/bin/env node
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const outPath = join(root, "eval", "datasets", "classifier-live.json");

const templates = {
  supports: [
    {
      title: "Replication confirms prior finding",
      citingAbstract:
        "We replicate the prior trial and observe the same protective effect on cardiovascular outcomes.",
      citedAbstract:
        "Randomized evidence that the intervention reduces major adverse cardiovascular events.",
      contexts: [
        "Our results replicate Smith et al. and confirm their finding that the therapy lowers event rates.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Independent validation study",
      citingAbstract:
        "Across three cohorts we validate the biomarker signature reported earlier.",
      citedAbstract:
        "A biomarker panel predicts treatment response with high sensitivity.",
      contexts: [
        "These findings validate the biomarker panel introduced by Chen et al.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Meta-analysis alignment",
      citingAbstract:
        "Pooled estimates align with the original effect direction and magnitude.",
      citedAbstract:
        "Single-center trial reporting a statistically significant mortality reduction.",
      contexts: [
        "Consistent with Lee et al., our meta-analysis supports a mortality benefit.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Prospective confirmation",
      citingAbstract:
        "Prospective sampling confirms the mechanism proposed in the foundational study.",
      citedAbstract:
        "Mechanistic study proposing a causal pathway for synaptic plasticity changes.",
      contexts: ["We confirm the synaptic mechanism described by Patel et al."],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Cross-lab agreement",
      citingAbstract:
        "An independent laboratory reproduces the reported dose-response curve.",
      citedAbstract:
        "Laboratory study establishing a dose-dependent transcriptional response.",
      contexts: [
        "Our dose-response curve agrees with the pattern reported by Nguyen et al.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Clinical extension with agreement",
      citingAbstract:
        "Hospital data corroborate the outpatient benefit described previously.",
      citedAbstract:
        "Outpatient trial demonstrating reduced readmissions after intervention.",
      contexts: [
        "Hospital admissions data corroborate the outpatient benefit found by Garcia et al.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Field study confirmation",
      citingAbstract:
        "Field measurements support the climate sensitivity estimate from the cited model.",
      citedAbstract:
        "Model-based estimate of regional climate sensitivity under warming.",
      contexts: [
        "Field observations support the sensitivity estimate from Williams et al.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Benchmark reproduction",
      citingAbstract:
        "Our benchmark reproduces the accuracy gains reported for the cited architecture.",
      citedAbstract:
        "Neural architecture achieving state-of-the-art accuracy on benchmark tasks.",
      contexts: [
        "We reproduce the accuracy improvements reported by Kim et al.",
      ],
      s2Intents: ["ResultComparison"],
    },
  ],
  contradicts: [
    {
      title: "Failed replication",
      citingAbstract:
        "We do not observe the reported effect under preregistered conditions.",
      citedAbstract:
        "Study claiming a large treatment effect in a randomized trial.",
      contexts: [
        "Unlike Johnson et al., we find no evidence for a treatment effect in our preregistered replication.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Counter-evidence on mechanism",
      citingAbstract:
        "Knockout experiments argue against the proposed causal pathway.",
      citedAbstract:
        "Mechanistic paper arguing that protein X drives the phenotype.",
      contexts: [
        "Our knockout results contradict the claim that protein X is necessary for the phenotype.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Negative trial",
      citingAbstract:
        "The intervention did not improve the primary endpoint versus placebo.",
      citedAbstract:
        "Positive phase II trial for the same endpoint and population.",
      contexts: [
        "In contrast to Martinez et al., our trial found no improvement on the primary endpoint.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Dataset challenge",
      citingAbstract:
        "Reanalysis shows the headline result is not robust to confounding adjustment.",
      citedAbstract:
        "Observational study reporting a strong association after basic controls.",
      contexts: [
        "Reanalysis shows the association reported by Brown et al. disappears after adjusting for confounders.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Measurement disagreement",
      citingAbstract:
        "Direct measurement yields opposite sign for the hypothesized effect.",
      citedAbstract:
        "Experimental result reporting a positive modulation of receptor activity.",
      contexts: [
        "We directly measure the opposite modulation, refuting the positive effect reported by Davis et al.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Theoretical refutation",
      citingAbstract:
        "Formal analysis shows the cited proof relies on an invalid assumption.",
      citedAbstract: "Proof of convergence for an optimization procedure.",
      contexts: [
        "We show the convergence proof of Taylor et al. relies on an assumption that fails in practical settings.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Null finding in extension",
      citingAbstract:
        "Applying the cited method to a new domain yields no predictive gain.",
      citedAbstract:
        "Method paper claiming universal gains across heterogeneous datasets.",
      contexts: [
        "Applying Wilson et al. to genomics datasets, we find no predictive improvement.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Safety contradiction",
      citingAbstract:
        "Post-market surveillance identifies adverse events not seen in the cited trial.",
      citedAbstract:
        "Trial concluding the drug has an acceptable safety profile.",
      contexts: [
        "Post-market data contradict the safety conclusion reached by Anderson et al.",
      ],
      s2Intents: ["ResultComparison"],
    },
  ],
  extends: [
    {
      title: "New domain application",
      citingAbstract:
        "We adapt the cited framework to pediatric imaging for the first time.",
      citedAbstract: "Framework for segmentation in adult chest radiographs.",
      contexts: [
        "We extend the segmentation framework of Clark et al. to pediatric imaging.",
      ],
      s2Intents: ["ResultComparison", "Methodology"],
    },
    {
      title: "Cross-species generalization",
      citingAbstract:
        "The cited model is transferred to a marine organism with novel adaptations.",
      citedAbstract: "Gene regulatory model established in mouse models.",
      contexts: [
        "We generalize the regulatory model from Harris et al. to a marine organism.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Scale extension",
      citingAbstract:
        "The approach is scaled from lab prototypes to city-wide deployment.",
      citedAbstract:
        "Prototype system validated in a controlled lab environment.",
      contexts: [
        "We scale the prototype system of Lopez et al. to city-wide deployment.",
      ],
      s2Intents: ["Methodology", "ResultComparison"],
    },
    {
      title: "Temporal extension",
      citingAbstract:
        "Longitudinal follow-up applies the cited short-term predictor over decades.",
      citedAbstract:
        "Short-term predictor of disease progression over six months.",
      contexts: [
        "We extend the short-term predictor of Moore et al. to decade-long trajectories.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Multimodal extension",
      citingAbstract:
        "Text and imaging modalities are combined using the cited representation.",
      citedAbstract:
        "Unimodal representation learning method for text-only corpora.",
      contexts: [
        "We extend the text representation of Allen et al. to multimodal clinical records.",
      ],
      s2Intents: ["Methodology", "ResultComparison"],
    },
    {
      title: "Policy extension",
      citingAbstract:
        "The cited econometric design is applied to a new policy regime.",
      citedAbstract: "Econometric evaluation of a labor market intervention.",
      contexts: [
        "We apply the evaluation design of Wright et al. to a new policy regime.",
      ],
      s2Intents: ["ResultComparison"],
    },
    {
      title: "Algorithmic extension",
      citingAbstract:
        "We extend the cited optimizer to constrained non-convex settings.",
      citedAbstract:
        "Optimizer for unconvex smooth objectives with convergence guarantees.",
      contexts: [
        "We extend the optimizer of Zhang et al. to constrained non-convex problems.",
      ],
      s2Intents: ["Methodology"],
    },
    {
      title: "Geographic extension",
      citingAbstract:
        "The cited intervention is evaluated in a low-resource rural setting.",
      citedAbstract:
        "Urban randomized trial of a digital adherence intervention.",
      contexts: [
        "We extend the digital adherence intervention of Thomas et al. to rural clinics.",
      ],
      s2Intents: ["ResultComparison"],
    },
  ],
  cites: [
    {
      title: "Background reference",
      citingAbstract:
        "We review prior work on protein folding before presenting our method.",
      citedAbstract: "Historical overview of protein folding pathways.",
      contexts: [
        "Protein folding has been studied extensively (Adams et al.).",
      ],
      s2Intents: ["Background"],
    },
    {
      title: "Method reuse only",
      citingAbstract:
        "We preprocess data using the standard pipeline from prior work.",
      citedAbstract: "Pipeline for normalizing RNA-seq count matrices.",
      contexts: [
        "Reads were processed with the pipeline described by Baker et al.",
      ],
      s2Intents: ["Methodology"],
    },
    {
      title: "Related work mention",
      citingAbstract:
        "Several models address graph clustering with different assumptions.",
      citedAbstract: "Graph clustering algorithm for social networks.",
      contexts: [
        "Graph clustering methods include the approach of Carter et al.",
      ],
      s2Intents: ["Background"],
    },
    {
      title: "Definitions only",
      citingAbstract:
        "We adopt the standard epidemiological definitions used in the literature.",
      citedAbstract: "Reference definitions for outbreak surveillance metrics.",
      contexts: ["We follow the case definitions of Evans et al."],
      s2Intents: ["Background"],
    },
    {
      title: "Dataset attribution",
      citingAbstract: "Experiments use a public benchmark introduced earlier.",
      citedAbstract: "Benchmark dataset for document classification.",
      contexts: ["Experiments use the benchmark released by Foster et al."],
      s2Intents: ["Background"],
    },
    {
      title: "Historical context",
      citingAbstract: "The debate has a long history in cognitive science.",
      citedAbstract: "Early cognitive science review of memory systems.",
      contexts: ["The debate dates back to classic work such as Green et al."],
      s2Intents: ["Background"],
    },
    {
      title: "Tool citation",
      citingAbstract:
        "Statistical tests were run in standard open-source software.",
      citedAbstract: "Software package for generalized linear modeling.",
      contexts: ["Analysis used the software described by Hall et al."],
      s2Intents: ["Methodology"],
    },
    {
      title: "Parallel independent work",
      citingAbstract:
        "Our approach is unrelated to concurrent work on the same topic.",
      citedAbstract: "Concurrent study on transformer interpretability.",
      contexts: ["Concurrent interpretability work includes Young et al."],
      s2Intents: ["Background"],
    },
  ],
};

const examples = [];
let counter = 1;

for (const [expected, items] of Object.entries(templates)) {
  for (const item of items) {
    const id = String(counter).padStart(3, "0");
    counter += 1;
    examples.push({
      id: `live-${id}`,
      expected,
      input: {
        citingId: `EVAL-C${id}`,
        citedId: `EVAL-D${id}`,
        citingTitle: `Eval citing paper ${id}: ${item.title}`,
        citingAbstract: item.citingAbstract,
        citedTitle: `Eval cited paper ${id}: ${item.title}`,
        citedAbstract: item.citedAbstract,
        citationContexts: item.contexts,
        s2Intents: item.s2Intents,
      },
    });
  }
}

writeFileSync(outPath, `${JSON.stringify(examples, null, 2)}\n`);
console.log(`Wrote ${examples.length} live eval examples to ${outPath}`);
