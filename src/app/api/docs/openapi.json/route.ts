import { NextRequest, NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/lib/api-docs/openapi";

export async function GET(req: NextRequest) {
  const spec = buildOpenApiDocument(req.nextUrl.origin);
  return NextResponse.json(spec, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}