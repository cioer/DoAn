import { Faculty, FacultyType } from '@prisma/client';

/**
 * Faculty Response DTO
 *
 * Standard response format for faculty data
 */
export class FacultyResponseDto {
  id: string;
  code: string;
  name: string;
  type: FacultyType;
  createdAt: Date;
  updatedAt: Date;

  static fromEntity(faculty: Faculty): FacultyResponseDto {
    return {
      id: faculty.id,
      code: faculty.code,
      name: faculty.name,
      type: faculty.type,
      createdAt: faculty.createdAt,
      updatedAt: faculty.updatedAt,
    };
  }

  static fromEntities(faculties: Faculty[]): FacultyResponseDto[] {
    return faculties.map((f) => this.fromEntity(f));
  }
}

/**
 * Paginated Faculty List Response
 */
export class FacultyListResponseDto {
  data: FacultyResponseDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
