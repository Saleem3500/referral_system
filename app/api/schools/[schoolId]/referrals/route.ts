import { NextRequest } from "next/server";
import { handleCreateReferral } from "@/controllers/referral.controller";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const { schoolId } = await params;
  return handleCreateReferral(req, schoolId);
}
