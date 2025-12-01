import { z } from 'zod';

// Define local enum to avoid dependency on generated Prisma Client
export enum FreelancerStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  ARCHIVED = 'Archived',
}

// Allowed roles for strict validation (could be dynamic in a real app)
const ALLOWED_ROLES = [
  'Designer', 'Senior Designer', 'Developer', 'Senior Developer',
  'Project Manager', 'Copywriter', 'Strategist', 'Video Editor'
] as const;

/**
 * Helper to sanitize Excel string inputs.
 * Excel often returns empty strings or whitespace where we expect null/undefined.
 */
const sanitizeString = (val: unknown): string | undefined => {
  if (typeof val !== 'string') return undefined;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Helper to parse Excel currency/numbers that might be strings "$1,200.00"
 */
const sanitizeNumber = (val: unknown): number | undefined => {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
};

export const ImportFreelancerRowSchema = z.object({
  // Email is required and must be valid. It's our primary key for upserts.
  email: z.preprocess(
    sanitizeString,
    z.string().email("Invalid email format")
  ),

  name: z.preprocess(
    sanitizeString,
    z.string().min(2, "Name too short")
  ),

  // Optional fields with transformations
  phone: z.preprocess(sanitizeString, z.string().optional()),
  
  role: z.preprocess(
    sanitizeString,
    z.string().optional()
    // Relaxed validation to allow new roles, or strictly check against enum:
    // .refine((val) => !val || ALLOWED_ROLES.includes(val as any), { message: "Invalid Role" })
  ),

  primarySkill: z.preprocess(sanitizeString, z.string().optional()),

  // Split comma-separated strings into an array
  skills: z.preprocess(
    (val) => {
      if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
      return [];
    },
    z.array(z.string())
  ),

  // Numeric handling
  rate: z.preprocess(sanitizeNumber, z.number().min(0).optional()),

  timezone: z.preprocess(sanitizeString, z.string().default('UTC')),
  
  portfolioUrl: z.preprocess(
    sanitizeString,
    z.string().url("Invalid URL").optional().or(z.literal(''))
  ),

  bio: z.preprocess(sanitizeString, z.string().optional()),

  // Enum validation with default
  status: z.preprocess(
    (val) => {
      const str = sanitizeString(val);
      if (!str) return FreelancerStatus.ACTIVE;
      // Capitalize first letter or uppercase to match enum strictly? 
      // Let's try to match case-insensitively
      const upper = str.toUpperCase();
      if (upper in FreelancerStatus) return upper as FreelancerStatus;
      return FreelancerStatus.ACTIVE;
    },
    z.nativeEnum(FreelancerStatus)
  ),
});

export type ImportFreelancerRow = z.infer<typeof ImportFreelancerRowSchema>;