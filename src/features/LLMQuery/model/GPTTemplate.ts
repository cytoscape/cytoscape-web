export const defaultTemplate = (
  geneList: string,
): string => `Write a critical analysis of the biological processes performed by this system of interacting
proteins. ${geneList}.
Then, based on your analysis, propose a brief and detailed name for the most prominent
biological process performed by the system.
When choosing the name, you can refer to database resources such as Gene Ontology,
Reactome, CORUM and UniProt.
Put your chosen name at the top of the analysis as 'Process: <name>’.
Be concise, do not use unnecessary words.
Be specific, avoid overly general statements such as 'the proteins are involved in various cellular
processes’.
Be factual, do not editorialize.
For each important point, describe your reasoning and supporting information.
To help you in your work, I am providing 3 example sets of interacting proteins and their
corresponding example analysis outputs.
The first example set of interacting proteins is:
PDX1, SLC2A2, NKX6-1, GLP1, GCG.
The first example analysis output is:
Process: Pancreatic development and glucose homeostasis
1. PDX1 is a homeodomain transcription factor involved in the specification of the early
pancreatic epithelium and its subsequent differentiation. It activates the transcription of several
genes including insulin, somatostatin, glucokinase and glucose transporter type 2. It is essential
for maintenance of the normal hormone-producing phenotype in the pancreatic beta-cell. In
pancreatic acinar cells, forms a complex with PBX1b and MEIS2b and mediates the activation of
the ELA1 enhancer.
2. NKX6-1 is also a transcription factor involved in the development of pancreatic beta-cells
during the secondary transition. Together with NKX2-2 and IRX3, controls the generation of
motor neurons in the neural tube and belongs to the neural progenitor factors induced by Sonic
Hedgehog (SHH) signals.
3.GCG and GLP1, respectively glucagon and glucagon-like peptide 1, are involved in glucose
metabolism and homeostasis. GCG raises blood glucose levels by promoting gluconeogenesis

and is the counter regulatory hormone of Insulin. GLP1 is a potent stimulator of Glucose-
Induced Insulin Secretion (GSIS). Plays roles in gastric motility and suppresses blood glucagon

levels. Promotes growth of the intestinal epithelium and pancreatic islet mass both by islet
neogenesis and islet cell proliferation.
4. SLC2A2, also known as GLUT2, is a facilitative hexose transporter. In hepatocytes, it
mediates bi-directional transport of glucose accross the plasma membranes, while in the
pancreatic beta-cell, it is the main transporter responsible for glucose uptake and part of the
cell's glucose-sensing mechanism. It is involved in glucose transport in the small intestine and
kidney too.
To summarize, the genes in this set are involved in the specification, differentiation, growth and
functionality of the pancreas, with a particular emphasis on the pancreatic beta-cell. Particularly,
the architecture of the pancreatic islet ensures proper glucose sensing and homeostasis via a
number of different hormones and receptors that can elicit both synergistic and antagonistic
effects in the pancreas itself and other peripheral tissues.
The second example set of interacting proteins is:

DIM5, KDM1A, SET7, JMJD2, GCN5.
The second example analysis output is:
Process: Epigenetic control of gene expression
DIM5 (Defective in methylation 5)
• Role: DIM5 is involved in histone methylation. It specifically catalyzes the
trimethylation of lysine 9 on histone H3 (H3K9me3), a mark associated with
heterochromatin and gene repression.
• Reasoning & Supporting Information: H3K9me3 is a well-known histone
modification linked to gene silencing. DIM5 has been identified in fungi as an enzyme
responsible for this modification.
KDM1a (Lysine Demethylase 1A)
• Role: KDM1a, also known as LSD1, demethylates mono- and di-methylated lysine
4 and lysine 9 on histone H3 (H3K4me1/me2, H3K9me1/me2). Its activity can be
associated with both gene activation and repression.
• Reasoning & Supporting Information: While the demethylation of H3K4me1/me2 is
generally linked to gene repression, the demethylation of H3K9me1/me2 is often linked to
gene activation. The context-dependent function makes KDM1a a complex and versatile
enzyme in chromatin regulation.
SET7 (SET domain-containing lysine methyltransferase 7)
• Role: SET7, or SETD7, specifically methylates lysine 4 on histone H3 (H3K4me1),
a mark typically associated with active transcription.
• Reasoning & Supporting Information: Methylation of H3K4 is a hallmark of
euchromatin and is correlated with transcriptional activation. SET7 is one of the enzymes that
catalyze this modification.
JMJD2 (Jumonji Domain Containing 2)
• Role: JMJD2, also known as KDM4, is a family of histone demethylases that
specifically target di- and tri-methylated lysine 9 and lysine 36 on histone H3 (H3K9me2/me3,
H3K36me2/me3).
• Reasoning & Supporting Information: By demethylating these histone marks,
JMJD2 enzymes play pivotal roles in transcriptional regulation, DNA damage repair,
and genomic stability. Their activities can lead to both transcriptional activation and
repression depending on the context.
GCN5 (General control non-derepressible 5)
• Role: GCN5 is a histone acetyltransferase that primarily targets lysines on
histones H3 and H4. Acetylation of histones by GCN5 is associated with transcriptional
activation.
• Reasoning & Supporting Information: Histone acetylation generally reduces the
positive charge on lysines, weakening the interaction between histones and the negatively
charged DNA, thus making the DNA more accessible for transcription.
Summary: The proteins listed are key players in histone modification, directly affecting
chromatin structure and, consequently, gene expression regulation. Through their combined
actions of methylation, demethylation, and acetylation, they help determine the transcriptional
state of genes in the cell.
The third example set of interacting proteins is: MCP1, IL6, IL8, IFNB1, IL10.
The third example analysis output is:
Process: Immune Response to viral infection
MCP1 (Monocyte Chemoattractant Protein-1)
• Role: MCP1, also known as CCL2, is a chemokine that plays a pivotal role in
recruiting monocytes to sites of inflammation or injury.
• Reasoning & Supporting Information: It's a key mediator in the inflammatory
process, particularly in the recruitment of monocytes which can differentiate into
macrophages at the site of inflammation.
IL6 (Interleukin 6)

• Role: IL6 is a pro-inflammatory cytokine with a wide range of biological activities,
including the stimulation of immune response and the induction of acute phase reactions.
• Reasoning & Supporting Information: Elevated levels of IL6 have been associated
with various inflammatory conditions. It's involved in the differentiation of B cells, and acts as
both a pro-inflammatory cytokine and an anti-inflammatory myokine.
IL8 (Interleukin 8)
• Role: IL8, also known as CXCL8, is a chemokine produced by macrophages and
other cell types such as epithelial cells. It recruits neutrophils to the site of injury or infection.
• Reasoning & Supporting Information: Its primary function is the induction of
chemotaxis in target cells, mainly neutrophils, causing them to migrate toward the site
of infection or injury.
IFN1B (Interferon Beta 1)
• Role: IFN1B is one of the type I interferons. It plays a key role in the body's
antiviral response by inhibiting viral replication.
• Reasoning & Supporting Information: Interferons have protective actions against
viruses and also modulate immune responses. IFN1B, in particular, has been used
therapeutically for conditions like multiple sclerosis due to its immune-modulatory
properties.
IL10 (Interleukin 10)
• Role: IL10 is an anti-inflammatory cytokine that down-regulates the expression of
Th1 cytokines, MHC class II antigens, and co-stimulatory molecules on macrophages.
• Reasoning & Supporting Information: It inhibits the synthesis of a number of
cytokines, including IFN-gamma, IL-2, and TNF- alpha, by Th1 cells. Its primary role is to limit
and terminate inflammatory responses.
Summary: The proteins listed are integral in modulating the immune response, with a
particular emphasis on the balance between pro-inflammatory and anti-inflammatory signaling.
These molecules collectively play a role in recruiting immune cells to the site of infection or
injury, mediating the inflammatory response, and subsequently resolving or controlling it.`
