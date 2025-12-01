import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service'; // Assuming generic Prisma module

// Define Assignment locally to avoid dependency on ungenerated Prisma Client
interface Assignment {
  id: string;
  startDate: Date;
  endDate: Date;
  allocation: number;
  freelancerId: string;
  projectId: string;
  role: string;
  status: string;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AvailabilityCheckResult {
  isAvailable: boolean;
  reason?: string;
  conflictingAssignments?: Assignment[];
}

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Checks if a freelancer can accept a new assignment based on date overlap and allocation %.
   */
  async checkConflicts(
    freelancerId: string,
    startDate: Date,
    endDate: Date,
    requestedAllocation: number = 100,
    excludeAssignmentId?: string
  ): Promise<AvailabilityCheckResult> {
    // 1. Fetch overlapping assignments from DB
    // Query Logic: (StartA <= EndB) AND (EndA >= StartB)
    const overlaps = await this.prisma.assignment.findMany({
      where: {
        freelancerId,
        id: excludeAssignmentId ? { not: excludeAssignmentId } : undefined,
        AND: [
          { startDate: { lte: endDate } },
          { endDate: { gte: startDate } },
        ],
      },
      select: {
        id: true,
        startDate: true,
        endDate: true,
        allocation: true,
        freelancerId: true,
        projectId: true,
        role: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: { name: true },
        },
      },
    });

    if (overlaps.length === 0) {
      return { isAvailable: true };
    }

    // 2. Calculate Daily Utilization
    // Since assignments might not overlap entirely with each other, strictly summing them 
    // across the whole range is inaccurate. However, for a rigorous check, 
    // if *any* day in the range exceeds 100%, it is a conflict.
    
    // Simplified robust approach: 
    // Check if the sum of allocations + request > 100 for the *conflicting set*.
    // Ideally, we scan day by day, but for performance, we often sum total concurrent overlaps.
    // A strictly defensive approach assumes worst-case overlap.
    
    let maxUtilization = 0;
    
    // We verify the maximum committed allocation at any point within the requested window.
    // We do this by checking "critical points" (start dates of overlaps).
    const pointsOfInterest = new Set<number>([
      startDate.getTime(),
      ...overlaps.map(o => Math.max(o.startDate.getTime(), startDate.getTime()))
    ]);

    for (const point of pointsOfInterest) {
      const checkDate = new Date(point);
      // If the check point is beyond our requested end date, ignore
      if (checkDate > endDate) continue;

      const activeAssignments = overlaps.filter(
        (a) => a.startDate <= checkDate && a.endDate >= checkDate
      );

      const currentLoad = activeAssignments.reduce((sum, a) => sum + a.allocation, 0);
      if (currentLoad > maxUtilization) {
        maxUtilization = currentLoad;
      }
    }

    const totalProjectedLoad = maxUtilization + requestedAllocation;

    if (totalProjectedLoad > 100) {
      const projectNames = overlaps.map((o: any) => o.project.name).join(', ');
      return {
        isAvailable: false,
        reason: `Overloaded: Projected utilization ${totalProjectedLoad}% exceeds capacity. Conflicts with: ${projectNames}`,
        conflictingAssignments: overlaps as unknown as Assignment[],
      };
    }

    return { isAvailable: true };
  }
}