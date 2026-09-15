import { NextRequest } from "next/server";
import { handleCreateSchool } from "@/controllers/school.controller";

export async function POST(req: NextRequest) {
  return handleCreateSchool(req);
}
