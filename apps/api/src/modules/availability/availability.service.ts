
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
    
    let maxUtilization = 0;
    
    // We verify the maximum committed allocation at any point within the requested window.
    // FIX: Safe date parsing for serialization robustness
    const pointsOfInterest = new Set<number>([
      new Date(startDate).getTime(),
      ...overlaps.map(o => new Date(o.startDate).getTime())
    ]);

    // Add the start time of the request itself
    pointsOfInterest.add(new Date(startDate).getTime());

    const endMs = new Date(endDate).getTime();

    for (const point of pointsOfInterest) {
      const checkDateMs = point;
      // If the check point is beyond our requested end date, ignore
      if (checkDateMs > endMs) continue;

      // Safe Date comparison using timestamps
      const activeAssignments = overlaps.filter((a) => {
          const aStart = new Date(a.startDate).getTime();
          const aEnd = new Date(a.endDate).getTime();
          return aStart <= checkDateMs && aEnd >= checkDateMs;
      });

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
