import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const WaitlistSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  referralSource: z.string().optional(),
});

// POST /api/waitlist — Add email to waitlist
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = WaitlistSchema.parse(body);

    await prisma.waitlistSignup.create({
      data: {
        email: parsed.email.toLowerCase().trim(),
        name: parsed.name?.trim() || null,
        company: parsed.company?.trim() || null,
        role: parsed.role?.trim() || null,
        referralSource: parsed.referralSource?.trim() || null,
      },
    });

    const totalCount = await prisma.waitlistSignup.count();

    return NextResponse.json({
      success: true,
      message: "You're on the list!",
      position: totalCount,
    });
  } catch (error) {
    // Handle duplicate email
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const totalCount = await prisma.waitlistSignup.count();
      return NextResponse.json({
        success: true,
        message: "You're already on the list!",
        position: totalCount,
        alreadySignedUp: true,
      });
    }

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: error.issues[0].message },
        { status: 400 }
      );
    }

    console.error("Waitlist signup error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// GET /api/waitlist — Get waitlist count (for social proof)
export async function GET() {
  try {
    const count = await prisma.waitlistSignup.count();
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Waitlist count error:", error);
    return NextResponse.json({ count: 0 });
  }
}
