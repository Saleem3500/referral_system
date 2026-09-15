import { NextRequest } from "next/server";
import { handleGetStats } from "@/controllers/referral.controller";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  return handleGetStats(req, schoolId);
}
