import { prisma } from '@/lib/prisma';
import { Plus, FolderOpen, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

export default async function ProjectsPage() {
  // Get all projects
  const projects = await prisma.project.findMany({
    orderBy: { updatedAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-cyan-400">AI Architect</h1>
              <p className="text-sm text-zinc-400">Your Projects</p>
            </div>
            <Link href="/projects/new">
              <Button className="gap-2 bg-cyan-500 hover:bg-cyan-600">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        {projects.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-20">
            <FolderOpen className="h-20 w-20 text-zinc-700 mb-6" />
            <h2 className="text-2xl font-bold text-white mb-2">No projects yet</h2>
            <p className="text-zinc-400 mb-6">Create your first architectural project to get started</p>
            <Link href="/projects/new">
              <Button className="gap-2 bg-cyan-500 hover:bg-cyan-600">
                <Plus className="h-4 w-4" />
                Create Project
              </Button>
            </Link>
          </div>
        ) : (
          // Projects Grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project: any) => (
              <Link key={project.id} href={`/dashboard?projectId=${project.id}`}>
                <Card className="bg-zinc-900 border-zinc-800 hover:border-cyan-500/50 transition-all cursor-pointer group">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-zinc-950 border-b border-zinc-800 flex items-center justify-center">
                    {project.thumbnail ? (
                      <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover" />
                    ) : (
                      <FolderOpen className="h-12 w-12 text-zinc-700 group-hover:text-cyan-500 transition-colors" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-white mb-1 group-hover:text-cyan-400 transition-colors">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{project.description}</p>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-col gap-2 text-xs text-zinc-500">
                      {project.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{project.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
