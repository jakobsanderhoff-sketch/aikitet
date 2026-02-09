import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/projects - List all projects
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}

// POST /api/projects - Create new project
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, location } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    // Create project with default empty blueprint
    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        location: location?.trim() || null,
        blueprintData: {
          projectName: name.trim(),
          location: location?.trim() || "",
          date: new Date().toISOString().split('T')[0],
          buildingCode: "BR18/BR23",
          sheets: [
            {
              number: "A-101",
              title: "Ground Floor Plan",
              type: "FLOOR_PLAN",
              scale: "1:100",
              elements: {
                walls: [],
                openings: [],
                rooms: [],
              },
              metadata: {
                scale: "1:100",
                unit: "m",
                grid: { enabled: true, spacing: 1 },
              },
            },
          ],
        },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }
}
