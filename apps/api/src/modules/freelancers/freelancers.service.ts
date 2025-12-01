
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FreelancersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const freelancers = await this.prisma.freelancer.findMany({
      include: { skills: true },
      orderBy: { name: 'asc' }
    });
    // Flatten skills for frontend compatibility
    return freelancers.map(f => ({
      ...f,
      skills: f.skills.map(s => s.name)
    }));
  }

  async findOne(id: string) {
    const f = await this.prisma.freelancer.findUnique({
      where: { id },
      include: { skills: true }
    });
    if (!f) return null;
    return { ...f, skills: f.skills.map(s => s.name) };
  }

  async create(data: any) {
    const { skills, ...rest } = data;
    return this.prisma.freelancer.create({
      data: {
        ...rest,
        skills: {
          connectOrCreate: (skills || []).map((name: string) => ({
            where: { name },
            create: { name }
          }))
        }
      },
      include: { skills: true }
    });
  }

  async update(id: string, data: any) {
    const { skills, ...rest } = data;
    return this.prisma.freelancer.update({
      where: { id },
      data: {
        ...rest,
        skills: skills ? {
          set: [], // Clear existing
          connectOrCreate: skills.map((name: string) => ({
            where: { name },
            create: { name }
          }))
        } : undefined
      },
      include: { skills: true }
    });
  }

  async remove(id: string) {
    return this.prisma.freelancer.delete({ where: { id } });
  }

  async createBatch(items: any[]) {
    // Sequential execution to handle connectOrCreate correctly
    let created = 0, updated = 0;
    for (const item of items) {
      const { id, skills, ...rest } = item;
      const email = rest.email || `temp-${Date.now()}-${Math.random()}@studio.com`;
      
      const skillOps = {
          connectOrCreate: (skills || []).map((name: string) => ({
            where: { name },
            create: { name }
          }))
      };

      try {
        await this.prisma.freelancer.upsert({
          where: { email },
          create: { ...rest, email, skills: skillOps },
          update: { ...rest, skills: skillOps }
        });
        // Simplistic count
        created++; 
      } catch (e) {
        console.error(e);
      }
    }
    return { created, updated, errors: [] };
  }
}
