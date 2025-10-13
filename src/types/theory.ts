// MTTS v5.0 Schema Interfaces

export interface IdAndClass {
  theory_title: string
  summary: string
  associated_thinkers: string[]
  category: string
  subcategory: string
  core_identity_tagline: string
  classification_tags: string[]
}

export interface ConceptualGround {
  explanatory_identity_claim: string
  ontological_status: string
  mind_body_relationship: string
  primitive_or_emergent_status: string
  emergence_type: string
  subjectivity_and_intentionality: string
  qualia_account: string
  ontological_commitments: string
  epistemic_access: string
  constituents_and_structure: string
}

export interface MechanismAndDynamics {
  scope_of_consciousness: string
  distinctive_mechanism_or_principle: string
  dynamics_of_emergence: string
  location_and_distribution: string
  causation_and_functional_role: string
  integration_or_binding: string
  information_flow_or_representation: string
  evolutionary_account: string
  core_claims_and_evidence: string[]
  basis_of_belief_or_evidence_type: string
}

export interface EmpiricsAndCritiques {
  testability_status: string
  known_empirical_interventions_or_tests: string
  criticisms_and_tensions: string
  open_questions_and_limitations: string
  ontological_coherence: string
}

export interface ImplicationStance {
  stance: string
  rationale: string
}

export interface Implications {
  AI_consciousness: ImplicationStance
  survival_beyond_death: ImplicationStance
  meaning_and_purpose: ImplicationStance
  virtual_immortality: ImplicationStance
}

export interface RelatedTheory {
  name: string
  relationship: string
}

export interface SourceReference {
  title_with_names: string
  year?: number
}

export interface RelationsAndSources {
  related_theories: RelatedTheory[]
  sources_and_references: SourceReference[]
}

export interface TheoryData {
  id_and_class: IdAndClass
  conceptual_ground: ConceptualGround
  mechanism_and_dynamics: MechanismAndDynamics
  empirics_and_critiques: EmpiricsAndCritiques
  implications: Implications
  relations_and_sources: RelationsAndSources
}
