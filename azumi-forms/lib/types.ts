export type QuestionType = 'text' | 'mc' | 'scale' | 'yn'

export interface Question {
  id: string
  type: QuestionType
  text: string
  required: boolean
  options?: string[]
}

export interface Form {
  id: string
  name: string
  client: string
  description: string
  expiry: string | null
  questions: Question[]
  created_at: string
}

export interface Response {
  id: string
  form_id: string
  form_name: string
  client: string
  answers: Record<string, { question: string; answer: string }>
  submitted_at: string
}
