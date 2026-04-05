export type Complexity = 'muy fácil' | 'fácil' | 'normal' | 'media';

export interface Slide {
  title: string;
  bulletPoints: string[];
}

export interface ClassPlan {
  id: string;
  title: string;
  objectives: string[];
  contents: string[];
  slides?: Slide[];
  activity: string;
  evaluation: string;
  bibliography: string[];
  isGenerated?: boolean;
}

export interface Block {
  id: string;
  title: string;
  classes: ClassPlan[];
}

export interface Trimester {
  id: string;
  title: string;
  blocks: Block[];
}

export interface AnnualPlan {
  trimesters: Trimester[];
}

export interface PlanningInput {
  syllabus: string;
  methodology: string;
  teacherProfile: string;
  bibliography: string;
  complexity: Complexity;
}

export type WizardStep = 
  | 'syllabus'
  | 'methodology'
  | 'profile'
  | 'outline'
  | 'bibliography'
  | 'classes';

export type GenerationStatus = 
  | 'idle'
  | 'generating'
  | 'completed'
  | 'error';
