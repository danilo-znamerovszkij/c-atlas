// Dynamic mapping of theory names to full names based on available JSON files
// This will be populated at runtime based on which theory files actually exist

// Static mapping for all possible theories (fallback)
const staticTheoryNames: Record<string, string> = {
  // 1.1 Philosophical Theories
  'Eliminative': 'Eliminative Materialism / Illusionism',
  'Epiphenomenalism': 'Epiphenomenalism',
  'Functionalism': 'Functionalism',
  'Emergence': 'Emergence',
  'Mind-Brain': 'Mind-Brain Identity Theory',
  'Searle': 'Searle\'s Biological Naturalism',
  'Block': 'Block\'s Biological Reductionism',
  'Flanagan': 'Flanagan\'s Constructive Naturalism',
  'Papineau': 'Papineau\'s Mind-Brain Identity',
  'Goldstein': 'Goldstein\'s Mind-Body Problem',
  'Hardcastle': 'Hardcastle\'s Argument Against Materialism Skeptics',
  'Stoljar': 'Stoljar\'s Epistemic View and Non-Standard Physicalism',
  
  // 1.2 Neurobiological Theories
  'Edelman': 'Edelman\'s Neural Darwinism and Reentrant Neural Circuitry',
  'Crick-Koch': 'Crick and Koch\'s Neural Correlates of Consciousness',
  'Baars-Dehaene': 'Baars\'s and Dehaene\'s Global Workspace Theory',
  'Dennett': 'Dennett\'s Multiple Drafts Model',
  'Minsky': 'Minsky\'s Society of Mind',
  'Graziano': 'Graziano\'s Attention Schema Theory',
  'Prinz': 'Prinz\'s Neurofunctionalism: Attention Engenders Experience',
  'Sapolsky': 'Sapolsky\'s Hard Incompatibilism',
  'Mitchell': 'Mitchell\'s Free Agents',
  'Bach': 'Bach\'s Cortical Conductor Theory',
  'Brain Circuits': 'Brain Circuits and Cycles Theories',
  'Northoff': 'Northoff\'s Temporo-Spatial Sentience',
  'Bunge': 'Bunge\'s Emergent Materialism',
  'Hirstein': 'Hirstein\'s Mindmelding',
  
  // 1.3 Electromagnetic Field Theories
  'Jones': 'Jones\'s Electromagnetic Fields',
  'Pockett': 'Pockett\'s Conscious and Non-Conscious Patterns',
  'McFadden': 'McFadden\'s Conscious Electromagnetic Information Theory',
  'Ephaptic': 'Ephaptic Coupling',
  'Ambron': 'Ambron\'s Local Field Potentials and Electromagnetic Waves',
  'Llinas': 'Llinas\'s Mindness State of Oscillations',
  'Zhang': 'Zhang\'s Long-Distance Light-Speed Telecommunications',
  
  // 1.4 Computational and Informational Theories
  'Computational': 'Computational Theories',
  'Grossberg': 'Grossberg\'s Adaptive Resonance Theory',
  'Adaptive Systems': 'Complex Adaptive Systems Models',
  'Critical Brain': 'Critical Brain Hypothesis',
  'Pribram': 'Pribram\'s Holonomic Brain Theory',
  'Doyle': 'Doyle\'s Experience Recorder and Reproducer',
  'Informational': 'Informational Realism and Emergent Information Theory',
  'Mathematical': 'Mathematical Theories',
  
  // 1.5 Homeostatic and Affective Theories
  'Predictive': 'Predictive Theories (Top-Down)',
  'Seth': 'Seth\'s "Beast Machine" Theory',
  'Damasio': 'Damasio\'s Homeostatic Feelings and Emergence of Consciousness',
  'Friston': 'Friston\'s Free-Energy Principle and Active Inference',
  'Solms': 'Solm\'s Affect as the Hidden Spring of Consciousness',
  'Carhart-Harris': 'Carhart-Harris\'s Entropic Brain Hypothesis',
  'Buzsáki': 'Buzsáki\'s Neural Syntax and Self-Caused Rhythms',
  'Deacon': 'Deacon\'s Self-Organized Constraint and Emergence of Self',
  'Pereira': 'Pereira\'s Sentience',
  'Mansell': 'Mansell\'s Perceptual Control Theory',
  'Projective': 'Projective Consciousness Model',
  'Pepperell': 'Pepperell\'s Organization of Energy',
  
  // 1.6 Embodied and Enactive Theories
  'Embodied': 'Embodied Cognition',
  'Enactivism': 'Enactivism',
  'Varela': 'Varela\'s Neurophenomenology',
  'Thompson': 'Thompson\'s Mind in Life',
  'Frank-Gleiser': 'Frank/Gleiser/Thompson\'s "The Blind Spot"',
  'Bitbol': 'Bitbol\'s Radical Neurophenomenology',
  'Direct Perception': 'Direct Perception Theory',
  'Gibson': 'Gibson\'s Ecological Psychology',
  
  // 1.7 Relational Theories
  'A. Clark': 'A. Clark\'s Extended Mind',
  'Noë': 'Noë\'s "Out of Our Heads" Theory',
  'Loorits': 'Loorits\'s Structural Realism',
  'Lahav': 'Lahav\'s Relativistic Theory',
  'Tsuchiya': 'Tsuchiya\'s Relational Approach to Consciousness',
  'Jaworski': 'Jaworski\'s Hylomorphism',
  'Process': 'Process Theory',
  
  // 1.8 Representational Theories
  'First-Order': 'First-Order Representationalism',
  'Lamme': 'Lamme\'s Recurrent Processing Theory',
  'Higher-Order': 'Higher-Order Theories',
  'Lau': 'Lau\'s Perceptual Reality Monitoring Theory',
  'LeDoux Higher-Order': 'LeDoux\'s Higher-Order Theory of Emotional Consciousness',
  'Humphrey': 'Humphrey\'s Mental Representations and Brain Attractors',
  'Metzinger': 'Metzinger\'s No-Self Representational Theory of Subjectivity',
  'Jackson': 'Jackson\'s Representationalism and the Knowledge Argument',
  'Lycan': 'Lycan\'s Homuncular Functionalism',
  'Transparency': 'Transparency Theory',
  'Tye': 'Tye\'s Contingentism',
  'Thagard': 'Thagard\'s Neural Representation, Binding, Coherence, Competition',
  'T. Clark': 'T. Clark\'s Content Hypothesis',
  'Deacon Symbolic': 'Deacon\'s Symbolic Communication (Human Consciousness)',
  
  // 1.9 Language Relationships
  'Chomsky': 'Chomsky\'s Language and Consciousness',
  'Searle Language': 'Searle\'s Language and Consciousness',
  'Koch Language': 'Koch\'s Consciousness does not Depend on Language',
  'Smith': 'Smith\'s Language as Classifier of Consciousness',
  'Jaynes': 'Jaynes\'s Breakdown of the Bicameral Mind',
  'Parrington': 'Parrington\'s Language and Tool-Driven Consciousness',
  
  // 1.10 Phylogenetic Evolution
  'Dennett Evolution': 'Dennett\'s Evolution of Minds',
  'LeDoux Deep Roots': 'LeDoux\'s Deep Roots of Consciousness',
  'Ginsburg-Jablonka': 'Ginsburg and Jablonka\'s Associative Learning During Evolution',
  'Cleeremans': 'Cleeremans and Tallon-Baudry\'s Functional Value',
  'Andrews': 'Andrews\'s Consciousness Without Complex Brains',
  'Reber': 'Reber\'s Cellular Basis of Consciousness',
  'Feinberg-Mallatt': 'Feinberg and Mallatt\'s Ancient Origins of Consciousness',
  'Levin': 'Levin\'s Technological Approach to Mind Everywhere',
  'James': 'No Hard Problem in William James\'s Psychology',
  
  // 2. NON-REDUCTIVE PHYSICALISM
  'Ellis': 'Ellis\'s Strong Emergence and Top-Down Causation',
  'Murphy': 'Murphy\'s Non-Reductive Physicalism',
  'van Inwagen': 'van Inwagen\'s Christian Materialism and Resurrection of the Dead',
  'Nagasawa Nontheoretical': 'Nagasawa\'s Nontheoretical Physicalism',
  'Sanfey': 'Sanfey\'s Abstract Realism',
  'Northoff Non-Reductive': 'Northoff\'s Non-Reductive Neurophilosophy',
  
  // 3. QUANTUM THEORIES
  'Penrose-Hameroff': 'Penrose-Hameroff\'s Orchestrated Objective Reduction',
  'Stapp': 'Stapp\'s Collapsing the Wave Function via Asking "Questions"',
  'Bohm': 'Bohm\'s Implicate-Explicate Order',
  'Pylkkänen': 'Pylkkänen\'s Quantum Potential Energy and Active Information',
  'Wolfram': 'Wolfram\'s Consciousness in the Ruliad',
  'Beck-Eccles': 'Beck-Eccles\'s Quantum Processes in the Synapse',
  'Kauffman': 'Kauffman\'s Mind Mediating Possibles to Actuals',
  'Torday': 'Torday\'s Cellular and Cosmic Consciousness',
  'Smolin': 'Smolin\'s Causal Theory of Views',
  'Carr': 'Carr\'s Quantum Theory, Psi, Mental Space',
  'Faggin': 'Faggin\'s Quantum Information-based Panpsychism',
  'Fisher': 'Fisher\'s Quantum Cognition',
  'Globus': 'Globus\'s Quantum Thermofield Brain Dynamics',
  'Poznanski': 'Poznanski\'s Dynamic Organicity Theory',
  'Quantum Extensions': 'Quantum Consciousness Extensions',
  'Rovelli': 'Rovelli\'s Relationship Physics',
  
  // 4. INTEGRATED INFORMATION THEORY
  'Critiques': 'Critiques of Integrated Information Theory',
  'Koch IIT': 'Koch Compares Integrated Information Theory with Panpsychism',
  
  // 5. PANPSYCHISMS
  'Micropsychism': 'Micropsychism',
  'Panprotopsychism': 'Panprotopsychism',
  'Cosmopsychism': 'Cosmopsychism',
  'Qualia Force': 'Qualia Force',
  'Qualia Space': 'Qualia Space',
  'Chalmers': 'Chalmers\'s Panpsychism',
  'Strawson': 'Strawson\'s Panpsychism',
  'Goff': 'Goff\'s Panpsychism',
  'A. Harris': 'A. Harris\'s Panpsychism as Fundamental Field',
  'Sheldrake': 'Sheldrake\'s Self-Organizing Systems at all Levels of Complexity',
  'Wallace': 'Wallace\'s Panpsychism Inside Physics',
  'Whitehead': 'Whitehead\'s Process Theory',
  
  // 6. MONISMS
  'Russellian': 'Russellian Monism',
  'Davidson': 'Davidson\'s Anomalous Monism',
  'Velmans': 'Velmans\'s Reflexive Monism',
  'Strawson Realistic': 'Strawson\'s Realistic Monism and Real Materialism',
  'Polkinghorne': 'Polkinghorne\'s Dual-Aspect Monism',
  'Teilhard': 'Teilhard de Cardin\'s Evolving Consciousness',
  'Atmanspacher': 'Atmanspacher\'s Dual-Aspect Monism',
  'Ramachandran': 'Ramachandran\'s New Physics and Neuroscience',
  'Tegmark': 'Tegmark\'s State of Matter',
  'QRI': 'QRI\'s State-Space, Qualia Formalism, Valence Realism',
  'Bentley Hart': 'Bentley Hart\'s Monism: Consciousness, Being, God',
  'Leslie': 'Leslie\'s Consciousness Inside an Infinite Mind',
  
  // 7. DUALISMS
  'Property': 'Property Dualism',
  'Traditional': 'Historical and Traditional Dualisms',
  'Swinburne': 'Swinburne\'s Substance Dualism',
  'Composite': 'Composite Dualism',
  'Stump': 'Stump\'s Thomistic Dualism',
  'Feser': 'Feser\'s Neo-Thomistic, Neo-Aristotelian, Common-Sense Dualism',
  'Moreland': 'Moreland\'s Christian Soul',
  'Interactive': 'Interactive Dualism',
  'Emergent': 'Emergent Dualism',
  'Kind': 'Kind\'s Dualism 2.0',
  'Hebrew Soul': 'Soul in the Hebrew Bible and Jewish Philosophy',
  'Christian Soul': 'Soul in the New Testament and Christian Philosophy',
  'Islamic Soul': 'Soul in Islamic Philosophy',
  'God-Supplied': 'God as the Supplier of Souls',
  'Indian': 'Personal and Cosmic Consciousness in Indian Philosophy',
  'Indigenous': 'Soul in Indigenous Religions',
  'Soul Realms': 'Realms of the Soul',
  'Theosophy': 'Theosophy\'s Eclectic Soul and Consciousness',
  'Steiner': 'Steiner\'s Esoteric Soul and Consciousness',
  'Nonphysical': 'Nonphysical Component in the Human Mind',
  
  // 8. IDEALISMS
  'Indian Cosmic': 'Indian Cosmic Consciousness',
  'Buddhism': 'Buddhism\'s Empty, Illusory Phenomenal Consciousness',
  'Dao': 'Dao De Jing\'s Constant Dao',
  'Kastrup': 'Kastrup\'s Analytic Idealism',
  'Hoffman': 'Hoffman\'s Conscious Realism: The Case Against Reality',
  'McGilchrist': 'McGilchrist\'s Relational, Creative-Process Idealism',
  'Chopra': 'Chopra\'s Only the Whole is Conscious',
  'Physical': 'How Consciousness Becomes the Physical Universe',
  'Goswami': 'Goswami\'s Self-Aware Universe',
  'Spira': 'Spira\'s Non-Duality',
  'Nader': 'Nader\'s All There Is',
  'Ward': 'Ward\'s Personal Idealism: Souls as Embodied Agents Created by God',
  'Albahari': 'Albahari\'s Perennial Idealism',
  'Meijer': 'Meijer\'s Universal Knowledge Field',
  'Imaginative': 'Idealism\'s Imaginative Expressions',
  
  // 9. ANOMALOUS AND ALTERED STATES THEORIES
  'Bergson': 'Bergson\'s Multiplicity, Duration, Perception, Memory',
  'Jung': 'Jung\'s Collective Unconscious and Synchronicity',
  'Radin': 'Radin\'s Challenge to Materialism',
  'Tart': 'Tart\'s Emergent Interactionism',
  'Josephson': 'Josephson\'s Psi-Informed Models',
  'Wilber': 'Wilber\'s Integral Theory',
  'Combs': 'Combs\'s Chaotic Attractor and Autopoietic Systems',
  'Schooler': 'Schooler\'s Resonance Theory and Subjective Time',
  'Sheldrake Morphic': 'Sheldrake\'s Morphic Fields',
  'Grinberg': 'Grinberg\'s Syntergic/Neuronal Field Theory',
  'Graboi': 'Graboi\'s Three-Aspect Model',
  'NDE': 'Near Death Experiences, Survival, Past Lives',
  'DOPS': 'DOPS\'s Consciousness Research and Theory',
  'Bitbol Phenomenological': 'Bitbol\'s Phenomenological Ontology',
  'Campbell': 'Campbell\'s Theory of Everything',
  'Hiller': 'Hiller\'s Eternal Discarnate Consciousness',
  'Harp': 'Harp\'s Universal or God Consciousness',
  'Swimme': 'Swimme\'s Cosmogenesis',
  'Langan': 'Langan\'s Cognitive-Theoretic Model of the Universe',
  'Meditation': 'Meditation and the Brain',
  'Psychedelic': 'Psychedelic Theories of Consciousness',
  
  // 10. CHALLENGE THEORIES
  'Nagel': 'Nagel\'s Mind and Cosmos',
  'McGinn': 'McGinn\'s Ultimate Mystery (Mysterianism)',
  'S. Harris': 'S. Harris\'s Mystery of Consciousness',
  'Eagleman': 'Eagleman\'s Possibilianism',
  'Tallis': 'Tallis\'s Anti-Neuromania Skepticism',
  'Nagasawa Mind-Body': 'Nagasawa\'s Mind-Body in an Infinitely Decomposable Universe',
  'Musser': 'Musser\'s "Is It Really So Hard?"',
  'Davies': 'Davies\'s Consciousness in the Cosmos'
}

// Export the static theory names as the main mapping
export const theoryFullNames = staticTheoryNames

// Function to get theory full name with fallback
export function getTheoryFullName(shortName: string): string {
  return staticTheoryNames[shortName] || shortName
}
