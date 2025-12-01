
// ... existing enums ...
export enum ProjectStatus {
  PLANNED = 'Planned',
  IN_PROGRESS = 'In Progress',
  REVIEW = 'Review',
  DELIVERED = 'Delivered',
  ARCHIVED = 'Archived',
}

export enum Priority {
  LOW = 'Low',
  NORMAL = 'Normal',
  HIGH = 'High',
  URGENT = 'Urgent',
}

export enum FreelancerStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  ARCHIVED = 'Archived',
}

export enum UtilizationBand {
  FREE = 'Free',
  LIGHT = 'Light',
  MEDIUM = 'Medium',
  OVERLOADED = 'Overloaded',
}

export interface User {
  id: string;
  name: string;
  contactInfo: string;
  role: 'Admin' | 'Manager' | 'Viewer';
  avatar?: string;
  passwordHash?: string; 
}

export interface Asset {
  id: string;
  projectId?: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  publicUrl?: string; // Optional, if public
  url?: string; // Signed URL for display
  createdAt: string;
}

export interface MoodboardItem {
  id: string;
  projectId: string;
  assetId?: string; // Link to Asset
  type: 'image' | 'video' | 'gif';
  url: string; // Display URL (signed)
  thumbnailUrl?: string;
  caption: string;
  tags: string[];
  moods: string[];
  colors: string[]; 
  shotType?: string;
  status: 'processing' | 'ready' | 'error';
  createdAt: string;
  updatedAt: string;
}

// ... existing types ...
export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface Freelancer {
  id: string;
  name: string;
  contactInfo: string;
  phone?: string; 
  role: string;
  primarySkill?: string; 
  bio?: string; 
  portfolioUrl?: string; 
  skills: string[];
  rate: number;
  currency: string;
  timezone: string;
  status: FreelancerStatus;
  utilization: number; 
  avatar?: string;
  notes?: string; 
  searchVector?: any; 
  nextAvailableDate?: string; 
  createdAt?: string; 
  updatedAt?: string; 
}

export interface Script {
  id: string;
  projectId?: string; 
  title: string; 
  content: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectContextItem {
  id: string;
  title: string;
  content: string;
  category: 'General' | 'Brand' | 'Research' | 'Technical';
  updatedAt: string;
}

export type MediaType = 'image' | 'video' | 'gif';

export interface Project {
  id: string;
  name: string;
  clientName?: string; 
  category?: string; 
  activation?: string; 
  description?: string; 
  references?: string[]; 
  notes?: string; 
  tags?: string[]; 
  toneAttributes?: string[]; 
  moodBoard?: string[]; 
  brandGuidelines?: {
    dos: string[];
    donts: string[];
  };
  format?: string; 
  length?: string; 
  status: ProjectStatus;
  priority?: Priority; 
  startDate?: string; 
  dueDate?: string; 
  idealPostDate?: string; 
  budget?: string; 
  roleRequirements: RoleRequirement[];
  assignedToId?: string; 
  knowledgeBase?: ProjectContextItem[]; 
  moodboardItems?: MoodboardItem[]; 
  shareToken?: string; 
  shareTokenCreatedAt?: string; 
  shareTokenExpiresAt?: string; 
  shareTokenRevokedAt?: string; 
  createdAt?: string; 
  updatedAt?: string; 
}

export interface RoleRequirement {
  id: string;
  role: string;
  count: number;
  filled: number;
  skillsRequired: string[];
}

export interface Assignment {
  id: string;
  projectId: string;
  freelancerId: string;
  role: string; 
  startDate: string;
  endDate: string;
  allocation: number; 
  status: 'Tentative' | 'Confirmed';
  notes?: string;
  createdAt?: string; 
  updatedAt?: string; 
}

export interface ActivityLog {
  id: string;
  action: string;
  details: string;
  timestamp: string;
  user: string;
}

export interface AuthResult {
  accessToken: string;
  user: User;
}

export interface ImportSummary {
  created: number;
  updated: number;
  errors: Array<{ row: number; message: string }>;
}

export interface Suggestion {
  freelancerId: string;
  score: number;
  reason: string;
  availabilityStatus: string;
}

export interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp?: string;
  path?: string;
}

export interface ApiResponse<T> {
  data?: T;
  meta?: Meta;
  message?: string; // Legacy
  success: boolean;
  error?: ApiError;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export type KnowledgeSourceType = 'url' | 'file' | 'text' | 'youtube' | 'wiki';

export interface KnowledgeChunk {
  id: string;
  sourceId: string;
  text: string;
  embedding?: number[];
  tags: string[];
  relevanceScore?: number;
}

export interface KnowledgeSource {
  id: string;
  type: KnowledgeSourceType;
  title: string;
  url?: string;
  assetId?: string; // Link to stored binary asset
  originalContent: string; 
  summary?: string; 
  status: 'processing' | 'indexed' | 'error';
  chunks: KnowledgeChunk[];
  createdAt: string;
}

export interface HallucinationCheck {
  hasViolation: boolean;
  violations: Array<{
    quote: string;
    rule: string;
    correction: string;
    startIndex?: number;
    endIndex?: number;
  }>;
}
