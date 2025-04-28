export interface User {
  id: number;
  username: string;
  name: string;
  role: string;
}

export interface ChatMessage {
  id: number;
  userId: number;
  content: string;
  isBot: boolean;
  timestamp: string; // ISO date string
}

export interface BusinessStat {
  id: number;
  userId: number;
  category: string; // "transport" or "farm"
  name: string;
  value: string;
  change?: string;
  changeType?: string; // "increase", "decrease" or null
  icon: string;
  color: string;
  timestamp: string; // ISO date string
}

export interface CreditOpportunity {
  id: number;
  title: string;
  description: string;
  institution: string;
  amount?: string;
  interestRate?: string;
  term?: string;
  category: string; // "farm", "transport"
  icon: string;
  color: string;
}

export interface MetaAd {
  id: number;
  title: string;
  description: string;
  company: string;
  imageUrl: string;
  category: string; // "farm", "transport", "other"
  contactUrl?: string;
}

export interface BusinessSuggestion {
  id: number;
  title: string;
  description: string;
  category: string; // "farm", "transport", "general"
  tags: string[];
  icon: string;
  color: string;
}

export interface NewsArticle {
  id: number;
  title: string;
  summary: string;
  source: string;
  category: string; // "farm", "transport", "finance", "general"
  imageUrl: string;
  publishedAt: string; // ISO date string
  url: string;
}

export interface GovernmentBid {
  id: number;
  title: string;
  description: string;
  bidNumber: string;
  publishedAt: string; // ISO date string
  closingDate: string; // ISO date string
  agency: string;
  value: string;
  category: string; // "transport", "farm", "general"
  url: string;
  status: string; // "open", "closed", "draft"
}

export interface GovernmentOfficial {
  id: number;
  name: string;
  position: string;
  department: string;
  institution: string;
  creditProgram: string;
  authority: string; // "alta", "média", "baixa"
  region: string;
  contactInfo?: string;
  email?: string;
  phone?: string;
  officeAddress?: string;
  appointmentDate?: string; // Data de nomeação
  education?: string;
  careerBackground?: string;
  photoUrl?: string;
  biography?: string;
  socialMedia?: {
    linkedin?: string;
    twitter?: string;
  };
  officialWebsite?: string;
  recentPublications?: string[];
  recentActions?: string[];
  responsibilityAreas?: string[];
  lastUpdated?: string; // Data da última atualização dos dados
  dataSource?: string; // Fonte oficial dos dados
}

export type ColorScheme = "light" | "dark" | "system";

export interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: ColorScheme;
  storageKey?: string;
}

export interface ThemeProviderState {
  theme: ColorScheme;
  setTheme: (theme: ColorScheme) => void;
}