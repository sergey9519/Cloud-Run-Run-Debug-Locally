
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.project.findMany({
      include: { roleRequirements: true, knowledgeBase: true },
      orderBy: { updatedAt: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: { roleRequirements: true, knowledgeBase: true, scripts: true, assignments: true }
    });
  }

  async create(data: any) {
    const { roleRequirements, knowledgeBase, ...rest } = data;
    return this.prisma.project.create({
      data: {
        ...rest,
        roleRequirements: {
          create: roleRequirements || []
        },
        // KnowledgeBase items usually come via knowledge module, but simple text items here:
        knowledgeSources: {
            create: (knowledgeBase || []).map((kb: any) => ({
                type: 'text',
                title: kb.title,
                originalContent: kb.content,
                status: 'indexed',
                summary: kb.category
            }))
        }
      },
      include: { roleRequirements: true }
    });
  }

  async update(id: string, data: any) {
    const { roleRequirements, knowledgeBase, ...rest } = data;
    
    // Simple update strategy: Update primitives directly
    const updated = await this.prisma.project.update({
      where: { id },
      data: rest,
      include: { roleRequirements: true }
    });

    // Handle Roles (Naive replacement or upsert needed for complex logic, keeping simple for now)
    // In a real app, we'd diff the roles.
    
    return updated;
  }

  async remove(id: string) {
    return this.prisma.project.delete({ where: { id } });
  }

  async removeBatch(ids: string[]) {
    return this.prisma.project.deleteMany({ where: { id: { in: ids } } });
  }
  
  async importBatch(items: any[]) {
      // Basic implementation
      let created = 0;
      for (const item of items) {
          try {
              await this.create(item);
              created++;
          } catch(e) {}
      }
      return { created, updated: 0, errors: [] };
  }
}
