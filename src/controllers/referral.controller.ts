import { NextRequest, NextResponse } from "next/server";
import { CreateReferralDto, TreeQueryDto } from "@/dtos/referral.dto";
import { createReferral, getReferralTree, getReferralStats } from "@/services/referral.service";
import { handleError } from "@/lib/errors";

export async function handleCreateReferral(req: NextRequest, schoolId: string) {
  try {
    const body = await req.json();

    const parsed = CreateReferralDto.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const user = await createReferral(schoolId, parsed.data);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}

export async function handleGetTree(req: NextRequest, schoolId: string) {
  try {
    const { searchParams } = new URL(req.url);

    const parsed = TreeQueryDto.safeParse({ depth: searchParams.get("depth") ?? undefined });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const tree = await getReferralTree(schoolId, parsed.data.depth);
    return NextResponse.json({ tree });
  } catch (err) {
    return handleError(err);
  }
}

export async function handleGetStats(req: NextRequest, schoolId: string) {
  try {
    const stats = await getReferralStats(schoolId);
    return NextResponse.json(stats);
  } catch (err) {
    return handleError(err);
  }
}
