import { NextRequest, NextResponse } from "next/server";
import { CreateSchoolDto } from "@/dtos/school.dto";
import { createSchool } from "@/services/school.service";
import { handleError } from "@/lib/errors";

export async function handleCreateSchool(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = CreateSchoolDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const school = await createSchool(parsed.data);
    return NextResponse.json(school, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
