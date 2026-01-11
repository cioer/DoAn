import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { Faculty, Prisma } from '@prisma/client';
import { PrismaService } from '../auth/prisma.service';
import { CreateFacultyDto, UpdateFacultyDto } from './dto';

/**
 * Faculty list response with pagination
 */
interface FacultyListResponse {
  faculties: Faculty[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Faculties Service
 *
 * Handles all faculty management operations including:
 * - Create faculty with code uniqueness validation
 * - Update faculty with audit logging
 * - Soft delete faculty
 * - List faculties with filtering and pagination
 */
@Injectable()
export class FacultiesService {
  private readonly logger = new Logger(FacultiesService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private auditService?: any,
  ) {}

  /**
   * Create a new faculty
   * @param createDto Faculty creation data
   * @param actorId User ID performing the action
   * @returns Created faculty
   */
  async create(
    createDto: CreateFacultyDto,
    actorId?: string,
  ): Promise<Faculty> {
    // Check if code already exists
    const existing = await this.prisma.faculty.findUnique({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new ConflictException(
        `Mã khoa "${createDto.code}" đã tồn tại`,
      );
    }

    const faculty = await this.prisma.faculty.create({
      data: {
        code: createDto.code,
        name: createDto.name,
        type: createDto.type || 'FACULTY',
      },
    });

    this.logger.log(`Faculty created: ${faculty.code} - ${faculty.name}`);

    // Audit log
    if (this.auditService && actorId) {
      await this.auditService.logAction(
        actorId,
        'CREATE',
        'Faculty',
        faculty.id,
        { code: faculty.code, name: faculty.name },
      );
    }

    return faculty;
  }

  /**
   * Get all faculties with pagination and filtering
   * @param params Query parameters
   * @returns Paginated faculty list
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
  }): Promise<FacultyListResponse> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 50, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.FacultyWhereInput = {};

    // Search by code or name
    if (params.search) {
      where.OR = [
        { code: { contains: params.search, mode: 'insensitive' } },
        { name: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    // Filter by type
    if (params.type) {
      where.type = params.type as any;
    }

    const [faculties, total] = await Promise.all([
      this.prisma.faculty.findMany({
        where,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
      }),
      this.prisma.faculty.count({ where }),
    ]);

    return {
      faculties,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single faculty by ID
   * @param id Faculty ID
   * @returns Faculty or null
   */
  async findOne(id: string): Promise<Faculty | null> {
    return this.prisma.faculty.findUnique({
      where: { id },
    });
  }

  /**
   * Get a faculty by code
   * @param code Faculty code
   * @returns Faculty or null
   */
  async findByCode(code: string): Promise<Faculty | null> {
    return this.prisma.faculty.findUnique({
      where: { code },
    });
  }

  /**
   * Update a faculty
   * @param id Faculty ID
   * @param updateDto Update data
   * @param actorId User ID performing the action
   * @returns Updated faculty
   */
  async update(
    id: string,
    updateDto: UpdateFacultyDto,
    actorId?: string,
  ): Promise<Faculty> {
    // Check if faculty exists
    const existing = await this.prisma.faculty.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    // If updating code, check for uniqueness
    if (updateDto.code && updateDto.code !== existing.code) {
      const codeExists = await this.prisma.faculty.findUnique({
        where: { code: updateDto.code },
      });

      if (codeExists) {
        throw new ConflictException(
          `Mã khoa "${updateDto.code}" đã tồn tại`,
        );
      }
    }

    const faculty = await this.prisma.faculty.update({
      where: { id },
      data: updateDto,
    });

    this.logger.log(`Faculty updated: ${faculty.code} - ${faculty.name}`);

    // Audit log
    if (this.auditService && actorId) {
      await this.auditService.logAction(
        actorId,
        'UPDATE',
        'Faculty',
        faculty.id,
        {
          before: { code: existing.code, name: existing.name },
          after: { code: faculty.code, name: faculty.name },
        },
      );
    }

    return faculty;
  }

  /**
   * Delete a faculty (soft delete not implemented for Faculty model)
   * @param id Faculty ID
   * @param actorId User ID performing the action
   * @returns Deleted faculty
   */
  async remove(id: string, actorId?: string): Promise<Faculty> {
    // Check if faculty exists
    const existing = await this.prisma.faculty.findUnique({
      where: { id },
      });

    if (!existing) {
      throw new NotFoundException('Không tìm thấy khoa');
    }

    // Check if faculty has users
    const userCount = await this.prisma.user.count({
      where: { facultyId: id },
    });

    if (userCount > 0) {
      throw new ConflictException(
        `Không thể xóa khoa đang có ${userCount} người dùng`,
      );
    }

    // Check if faculty has proposals
    const proposalCount = await this.prisma.proposal.count({
      where: { facultyId: id },
    });

    if (proposalCount > 0) {
      throw new ConflictException(
        `Không thể xóa khoa đang có ${proposalCount} đề tài`,
      );
    }

    const faculty = await this.prisma.faculty.delete({
      where: { id },
    });

    this.logger.log(`Faculty deleted: ${faculty.code} - ${faculty.name}`);

    // Audit log
    if (this.auditService && actorId) {
      await this.auditService.logAction(
        actorId,
        'DELETE',
        'Faculty',
        faculty.id,
        { code: faculty.code, name: faculty.name },
      );
    }

    return faculty;
  }

  /**
   * Get all faculties for select/dropdown (simplified format)
   * @returns Array of faculties with id, code, and name
   */
  async getAllForSelect(): Promise<Array<{ id: string; code: string; name: string }>> {
    return this.prisma.faculty.findMany({
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { code: 'asc' },
    });
  }
}
