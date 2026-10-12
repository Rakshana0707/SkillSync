'use client'

import { create } from 'zustand'
import { SkillProgress, TestSession, Hackathon, UserProfile } from '@/types'

interface AppStore {
  profile: UserProfile | null
  skillProgress: SkillProgress[]
  currentSession: TestSession | null
  hackathons: Hackathon[]
  sidebarOpen: boolean
  theme: 'dark' | 'light'

  setProfile: (p: UserProfile | null) => void
  setSkillProgress: (sp: SkillProgress[]) => void
  updateSkillProgress: (skill: string, data: Partial<SkillProgress>) => void
  setCurrentSession: (s: TestSession | null) => void
  setHackathons: (h: Hackathon[]) => void
  addHackathon: (h: Hackathon) => void
  setSidebarOpen: (v: boolean) => void
  setTheme: (t: 'dark' | 'light') => void
}

export const useAppStore = create<AppStore>((set) => ({
  profile: null,
  skillProgress: [],
  currentSession: null,
  hackathons: [],
  sidebarOpen: false,
  theme: 'dark',

  setProfile: (profile) => set({ profile }),
  setSkillProgress: (skillProgress) => set({ skillProgress }),
  updateSkillProgress: (skill, data) =>
    set((state) => ({
      skillProgress: state.skillProgress.map((sp) =>
        sp.skill === skill ? { ...sp, ...data } : sp
      ),
    })),
  setCurrentSession: (currentSession) => set({ currentSession }),
  setHackathons: (hackathons) => set({ hackathons }),
  addHackathon: (h) =>
    set((state) => ({ hackathons: [h, ...state.hackathons] })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setTheme: (theme) => set({ theme }),
}))
