export interface TheoryArgument {
  id: string
  description: string
  tags: string[]
  clarity_rationality: string
  philosophical_tensions: string[]
}

export interface TheoryFunctionAndEvolution {
  function: string
  evolution: string
}

export interface TheoryOverview {
  purpose: string
  focus: string
  approach: string
}

export interface TheoryComponents {
  ontologicalStatus: string
  explanatoryIdentity: string
  functionAndEvolution: TheoryFunctionAndEvolution
  causation: string
  location: string
  arguments: TheoryArgument[]
}

export interface TheoryBigQuestions {
  ultimateMeaning: string
  aiConsciousness: string
  virtualImmortality: string
  survivalBeyondDeath: string
}

export interface TheoryPhilosophicalFocus {
  mindBodyProblem: string
  consciousnessNature: string
  primitiveVsEmergent: string
  reductionism: string
}

export interface TheoryData {
  theoryTitle: string
  category: string
  summary: string
  overview: TheoryOverview
  components: TheoryComponents
  bigQuestions: TheoryBigQuestions
  philosophicalFocus: TheoryPhilosophicalFocus
}
