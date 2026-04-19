"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type Project = {
  id: string;
  provider: "vercel" | "netlify";
  name: string;
  framework: string | null;
  url: string | null;
  updated_at: string;
};

type ProjectListProps = {
  projects: Project[];
};

export function ProjectList({ projects }: ProjectListProps) {
  const [providerFilter, setProviderFilter] = useState<"all" | "vercel" | "netlify">("all");

  const filteredProjects = useMemo(() => {
    if (providerFilter === "all") {
      return projects;
    }
    return projects.filter((project) => project.provider === providerFilter);
  }, [projects, providerFilter]);

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Connected Projects</CardTitle>
          <CardDescription>
            Every connected deployment target that can be scanned for auth exposure.
          </CardDescription>
        </div>

        <div className="w-full sm:w-44">
          <Select value={providerFilter} onValueChange={(value) => setProviderFilter(value as typeof providerFilter)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              <SelectItem value="vercel">Vercel only</SelectItem>
              <SelectItem value="netlify">Netlify only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filteredProjects.length === 0 ? (
          <p className="rounded-lg border border-dashed border-[#314158] p-6 text-sm text-slate-400">
            No projects synced yet. Connect Vercel or Netlify, then run your first scan.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project) => (
              <div
                key={project.id}
                className="flex flex-col gap-3 rounded-lg border border-[#26364b] bg-[#0f1724] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-slate-100">{project.name}</p>
                  <p className="text-sm text-slate-400">{project.url ?? "No production URL found"}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={project.provider === "vercel" ? "info" : "warning"}>
                    {project.provider}
                  </Badge>
                  {project.framework ? <Badge variant="default">{project.framework}</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
