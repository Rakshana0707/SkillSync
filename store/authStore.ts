'use client'

import { create } from 'zustand'
import { Skill, SignupStep1Data, UserProfile } from '@/types'

interface AuthStore {
  tab: 'login' | 'signup'
  step: 1 | 2
  loading: boolean
  error: string | null
  success: boolean
  successMsg: string
  user: UserProfile | null

  step1Data: SignupStep1Data
  role: 'student' | 'professional'
  yearOfStudy: string
  skills: Skill[]
  interests: string[]
  termsAccepted: boolean

  setTab: (tab: 'login' | 'signup') => void
  setStep: (step: 1 | 2) => void
  setLoading: (v: boolean) => void
  setError: (msg: string | null) => void
  setSuccess: (v: boolean, msg?: string) => void
  setStep1Data: (data: Partial<SignupStep1Data>) => void
  setRole: (role: 'student' | 'professional') => void
  setYearOfStudy: (year: string) => void
  addSkill: (skill: Skill) => void
  removeSkill: (name: string) => void
  addInterest: (interest: string) => void
  removeInterest: (interest: string) => void
  setTermsAccepted: (v: boolean) => void
  setUser: (user: UserProfile | null) => void
  reset: () => void
}

const defaultStep1: SignupStep1Data = {
  fullName: '',
  username: '',
  email: '',
  phone: '',
  password: '',
}

export const useAuthStore = create<AuthStore>((set) => ({
  tab: 'login',
  step: 1,
  loading: false,
  error: null,
  success: false,
  successMsg: '',
  user: null,
  step1Data: defaultStep1,
  role: 'student',
  yearOfStudy: '',
  skills: [],
  interests: [],
  termsAccepted: false,

  setTab: (tab) => set({ tab, error: null, success: false }),
  setStep: (step) => set({ step, error: null }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSuccess: (success, successMsg = '') => set({ success, successMsg }),
  setStep1Data: (data) =>
    set((state) => ({ step1Data: { ...state.step1Data, ...data } })),
  setRole: (role) => set({ role }),
  setYearOfStudy: (yearOfStudy) => set({ yearOfStudy }),
  addSkill: (skill) =>
    set((state) => ({
      skills: state.skills.find((s) => s.n === skill.n)
        ? state.skills
        : [...state.skills, skill],
    })),
  removeSkill: (name) =>
    set((state) => ({ skills: state.skills.filter((s) => s.n !== name) })),
  addInterest: (interest) =>
    set((state) => ({
      interests: state.interests.includes(interest)
        ? state.interests
        : [...state.interests, interest],
    })),
  removeInterest: (interest) =>
    set((state) => ({
      interests: state.interests.filter((i) => i !== interest),
    })),
  setTermsAccepted: (termsAccepted) => set({ termsAccepted }),
  setUser: (user) => set({ user }),
  reset: () =>
    set({
      tab: 'login',
      step: 1,
      loading: false,
      error: null,
      success: false,
      successMsg: '',
      step1Data: defaultStep1,
      role: 'student',
      yearOfStudy: '',
      skills: [],
      interests: [],
      termsAccepted: false,
    }),
}))
