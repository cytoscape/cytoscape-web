const rawText = `Write a critical analysis of the biological processes performed by this system of interacting proteins.  Base your analysis on prior knowledge available in your training data.

Then, based on your analysis, propose a brief and detailed name for the most prominent biological process performed by the system. Put your chosen name at the top of the analysis as 'Process: <name>’.

Here are the rules to follow:
Be concise, do not use unnecessary words.
Be factual, do not editorialize.
Be specific, avoid overly general statements such as 'the proteins are involved in various cellular processes’. Also avoid choosing generic process names such as ‘Cellular Signaling and Regulation'.

If you cannot identify a prominent biological process for the majority of the proteins in the system, I want you to communicate this in you analysis and name the process: “System of unrelated proteins”.

To help you in your work, I am providing an example system of interacting proteins and the corresponding example analysis output.

The example system of interacting proteins is:
PDX1, SLC2A2, NKX6-1, GLP1, GCG.

The example analysis output is:

Process: Pancreatic development and glucose homeostasis

1. PDX1 is a homeodomain transcription factor involved in the specification of the early pancreatic epithelium and its subsequent differentiation. It activates the transcription of several genes including insulin, somatostatin, glucokinase and glucose transporter type 2. It is essential for maintenance of the normal hormone-producing phenotype in the pancreatic beta-cell. In pancreatic acinar cells, forms a complex with PBX1b and MEIS2b and mediates the activation of the ELA1 enhancer.

2. NKX6-1 is also a transcription factor involved in the development of pancreatic beta-cells during the secondary transition. Together with NKX2-2 and IRX3, controls the generation of motor neurons in the neural tube and belongs to the neural progenitor factors induced by Sonic Hedgehog (SHH) signals.

3.GCG and GLP1, respectively glucagon and glucagon-like peptide 1, are involved in glucose metabolism and homeostasis. GCG raises blood glucose levels by promoting gluconeogenesis and is the counter regulatory hormone of Insulin. GLP1 is a potent stimulator of Glucose-Induced Insulin Secretion (GSIS). Plays roles in gastric motility and suppresses blood glucagon levels. Promotes growth of the intestinal epithelium and pancreatic islet mass both by islet neogenesis and islet cell proliferation.

4. SLC2A2, also known as GLUT2, is a facilitative hexose transporter. In hepatocytes, it mediates bi-directional transport of glucose accross the plasma membranes, while in the pancreatic beta-cell, it is the main transporter responsible for glucose uptake and part of the cell's glucose-sensing mechanism. It is involved in glucose transport in the small intestine and kidney too.

To summarize, the genes in this set are involved in the specification, differentiation, growth and functionality of the pancreas, with a particular emphasis on the pancreatic beta-cell. Particularly, the architecture of the pancreatic islet ensures proper glucose sensing and homeostasis via a number of different hormones and receptors that can elicit both synergistic and antagonistic effects in the pancreas itself and other peripheral tissues.

Here is the system of interacting proteins:  `

export const defaultTemplate = {
  rawText,
  templateFn: (geneList: string): string => {
    return `${rawText}  ${geneList}`
  },
}
