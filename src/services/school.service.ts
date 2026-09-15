import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { CreateSchoolInput } from "@/dtos/school.dto";
import { School } from "@/entities/school.entity";

export async function createSchool(data: CreateSchoolInput): Promise<School> {
  const school = await prisma.school.create({
    data: {
      name: data.name,
    },
  });
  return school as School;
}

export async function findSchoolById(id: string): Promise<School> {
  const school = await prisma.school.findFirst({
    where: { id, deletedAt: null },
  });

  if (!school) {
    throw new AppError("School not found", 404);
  }

  return school as School;
}
