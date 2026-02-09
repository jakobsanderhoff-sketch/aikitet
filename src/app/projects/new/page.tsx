"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error("Failed to create project");
      }

      const project = await response.json();
      router.push(`/dashboard?projectId=${project.id}`);
    } catch (error) {
      console.error("Error creating project:", error);
      alert("Failed to create project. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <Link href="/projects" className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
        </div>
      </header>

      {/* Form */}
      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create New Project</h1>
          <p className="text-zinc-400">Set up a new architectural design project</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Project Name */}
          <div>
            <Label htmlFor="name" className="text-white mb-2 block">
              Project Name *
            </Label>
            <Input
              id="name"
              type="text"
              required
              placeholder="e.g., Residential Building A"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-white mb-2 block">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description of the project..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-zinc-900 border-zinc-800 text-white min-h-[100px]"
            />
          </div>

          {/* Location */}
          <div>
            <Label htmlFor="location" className="text-white mb-2 block">
              Location
            </Label>
            <Input
              id="location"
              type="text"
              placeholder="e.g., Hvidovre, Copenhagen"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          {/* Building Code (read-only for now) */}
          <div>
            <Label htmlFor="buildingCode" className="text-white mb-2 block">
              Building Code
            </Label>
            <Input
              id="buildingCode"
              type="text"
              value="BR18/BR23 (Danish Regulations)"
              readOnly
              className="bg-zinc-800 border-zinc-700 text-zinc-400"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={loading || !formData.name.trim()}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Project"
              )}
            </Button>
            <Link href="/projects" className="flex-1">
              <Button type="button" variant="outline" className="w-full border-zinc-700">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
