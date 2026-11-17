import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const { GET: defaultGet, POST: defaultPost } = toNextJsHandler(auth);

export const GET = async (req: NextRequest) => {
  try {
    return await defaultGet(req);
  } catch (error) {
    console.error("[Better-Auth GET Failure]:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : String(error),
        tip: "Check DATABASE_URL and database connectivity in Vercel environment variables.",
      },
      { status: 500 },
    );
  }
};

export const POST = async (req: NextRequest) => {
  try {
    return await defaultPost(req);
  } catch (error) {
    console.error("[Better-Auth POST Failure]:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message: error instanceof Error ? error.message : String(error),
        tip: "Check DATABASE_URL and database connectivity in Vercel environment variables.",
      },
      { status: 500 },
    );
  }
};

