export interface Skill {
  n: string
  c: string
}

export interface AuthFormState {
  tab: 'login' | 'signup'
  step: 1 | 2
  loading: boolean
  error: string | null
  success: boolean
  successMsg: string
}

export interface SignupStep1Data {
  fullName: string
  username: string
  email: string
  phone: string
  password: string
}

export interface SignupStep2Data {
  role: 'student' | 'professional'
  yearOfStudy: string
  skills: Skill[]
  interests: string[]
  termsAccepted: boolean
}

export interface UserProfile {
  id: string
  full_name: string
  username: string
  email: string
  phone?: string
  avatar_url?: string
  bio?: string
  role: 'student' | 'professional'
  year_of_study?: string
  theme: 'dark' | 'light' | 'system'
  skills: Skill[]
  interests: string[]
  created_at: string
}

export type QuestionLevel = 'easy' | 'medium' | 'hard'

export interface Question {
  id: string
  skill: string
  level: QuestionLevel
  question: string
  options: string[]
  correct: number
  explanation: string
  concepts: string[]
}

export interface TestSession {
  id: string
  skill: string
  level: QuestionLevel
  questions: Question[]
  answers: (number | null)[]
  timeLimit: number
  startTime: number
  submitted: boolean
  autoSubmitReason?: string
  score?: number
  weakConcepts?: string[]
}

export interface SkillProgress {
  skill: string
  easyCompleted: boolean
  mediumCompleted: boolean
  hardCompleted: boolean
  easyScore?: number
  mediumScore?: number
  hardScore?: number
  weakConcepts: string[]
  testsAttempted: number
  lastAttempt?: string
  easyVerifiedAt?: string
  mediumVerifiedAt?: string
  hardVerifiedAt?: string
}

// Number of days a verified badge stays valid before it needs a retest.
export const BADGE_VALIDITY_DAYS = 90

// Minimum time a user must wait before retrying the same skill/level after a
// failed (or auto-submitted) attempt, to discourage rapid-fire farming.
export const RETEST_COOLDOWN_MINUTES = 30

export interface LeaderboardEntry {
  username: string
  fullName: string
  avatarUrl?: string
  skill: string
  bestLevel: 'none' | QuestionLevel
  bestScore: number
  testsAttempted: number
}

export interface PublicProfileSkill {
  skill: string
  easyCompleted: boolean
  mediumCompleted: boolean
  hardCompleted: boolean
  easyScore?: number
  mediumScore?: number
  hardScore?: number
  easyVerifiedAt?: string
  mediumVerifiedAt?: string
  hardVerifiedAt?: string
}

export interface PublicProfile {
  fullName: string
  username: string
  avatarUrl?: string
  bio?: string
  role: string
  skills: PublicProfileSkill[]
}

export interface PeerReview {
  id?: string
  hackathonId: string
  reviewerId: string
  revieweeId: string
  contributionRating: number
  communicationRating: number
  technicalRating: number
  comment?: string
}

export interface CollaborationScore {
  revieweeId: string
  fullName: string
  avgContribution: number
  avgCommunication: number
  avgTechnical: number
  overallScore: number
  reviewCount: number
}

export interface HackathonMember {
  email: string
  userId?: string
  name?: string
  testCompleted: boolean
  skillScores?: Record<string, number>
  joinedAt?: string
  inviteAccepted?: boolean
}

export interface Hackathon {
  id: string
  userId: string
  teamName: string
  problemStatement: string
  oldIdea?: string
  attendedAt?: string
  members: HackathonMember[]
  analysisComplete: boolean
  teamAnalysis?: string
  personalAnalysis?: string
  createdAt: string
}

export const SKILLS_LIST: Skill[] = [
  { n: 'MySQL', c: 'Database' },
  { n: 'PostgreSQL', c: 'Database' },
  { n: 'MongoDB', c: 'Database' },
  { n: 'Redis', c: 'Database' },
  { n: 'SQLite', c: 'Database' },
  { n: 'Firebase', c: 'Database' },
  { n: 'React.js', c: 'Frontend' },
  { n: 'Vue.js', c: 'Frontend' },
  { n: 'Angular', c: 'Frontend' },
  { n: 'Next.js', c: 'Frontend' },
  { n: 'HTML/CSS', c: 'Frontend' },
  { n: 'Tailwind CSS', c: 'Frontend' },
  { n: 'Svelte', c: 'Frontend' },
  { n: 'Node.js', c: 'Backend' },
  { n: 'Express.js', c: 'Backend' },
  { n: 'Django', c: 'Backend' },
  { n: 'FastAPI', c: 'Backend' },
  { n: 'Spring Boot', c: 'Backend' },
  { n: 'Laravel', c: 'Backend' },
  { n: 'NestJS', c: 'Backend' },
  { n: 'Python', c: 'Language' },
  { n: 'JavaScript', c: 'Language' },
  { n: 'TypeScript', c: 'Language' },
  { n: 'Java', c: 'Language' },
  { n: 'C++', c: 'Language' },
  { n: 'Go', c: 'Language' },
  { n: 'Rust', c: 'Language' },
  { n: 'Kotlin', c: 'Language' },
  { n: 'Docker', c: 'DevOps' },
  { n: 'Kubernetes', c: 'DevOps' },
  { n: 'AWS', c: 'Cloud' },
  { n: 'GCP', c: 'Cloud' },
  { n: 'Azure', c: 'Cloud' },
  { n: 'Git', c: 'Tools' },
  { n: 'GraphQL', c: 'API' },
  { n: 'REST APIs', c: 'API' },
  { n: 'Flutter', c: 'Mobile' },
  { n: 'React Native', c: 'Mobile' },
]

export const INTERESTS_LIST: string[] = [
  'Web Development',
  'Mobile Development',
  'AI / Machine Learning',
  'Data Science',
  'DevOps & Cloud',
  'Cybersecurity',
  'Blockchain',
  'Game Development',
  'System Design',
  'Open Source',
  'Competitive Programming',
  'UI/UX Design',
  'AR/VR',
  'Robotics',
]

export const TIME_LIMITS: Record<QuestionLevel, number> = {
  easy: 15 * 60,    // 15 minutes
  medium: 25 * 60,  // 25 minutes
  hard: 40 * 60,    // 40 minutes
}

export const PASS_THRESHOLD = 0.6 // 60% to pass a level
