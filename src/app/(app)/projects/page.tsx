"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FolderOpen,
  Plus,
  Search,
  Grid3X3,
  List,
  MoreHorizontal,
  Clock,
  Share2,
  Trash2,
  Edit,
  Star,
  StarOff,
  Loader2,
  BookOpen,
  FileUp,
  Bell,
  BellOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ImportPapersDialog } from "@/components/projects/import-papers-dialog";
import {
  getProjects,
  getCollections,
  createProject,
  deleteProject,
  toggleProjectFavorite,
  createCollection,
  setCollectionWatch,
  type ProjectData,
  type CollectionData,
} from "@/app/(app)/dashboard/actions";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [collections, setCollections] = useState<CollectionData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<ProjectData | null>(
    null,
  );
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [importCollection, setImportCollection] =
    useState<CollectionData | null>(null);

  const handleCreateProject = async (data: {
    title: string;
    description: string;
    color: string;
  }) => {
    try {
      const newProject = await createProject(data);
      setProjects([newProject, ...projects]);
    } catch (e) {
      console.error("Failed to create project", e);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [loadedProjects, loadedCollections] = await Promise.all([
        getProjects(),
        getCollections(),
      ]);
      setProjects(loadedProjects);
      setCollections(loadedCollections);
    } catch (e) {
      console.error("Failed to load projects", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredProjects = projects.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const projectCollections = selectedProject
    ? collections.filter((c) => c.projectId === selectedProject.id)
    : [];

  const handleToggleFavorite = async (projectId: string) => {
    await toggleProjectFavorite(projectId);
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, isFavorite: !p.isFavorite } : p,
      ),
    );
  };

  const handleDeleteProject = async (projectId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this project? This action cannot be undone.",
    );
    if (!confirmed) return;
    await deleteProject(projectId);
    setProjects((prev) => prev.filter((p) => p.id !== projectId));
    if (selectedProject?.id === projectId) setSelectedProject(null);
  };

  const handleAddCollection = async () => {
    if (!selectedProject) return;
    const title = window.prompt("Collection name:");
    if (!title?.trim()) return;

    try {
      const newCollection = await createCollection({
        title: title.trim(),
        projectId: selectedProject.id,
      });
      setCollections((prev) => [newCollection, ...prev]);
      setProjects((prev) =>
        prev.map((p) =>
          p.id === selectedProject.id
            ? { ...p, collectionCount: p.collectionCount + 1 }
            : p,
        ),
      );
    } catch (e) {
      console.error("Failed to create collection", e);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-muted/30 min-h-full pb-10">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <FolderOpen className="text-primary h-6 w-6" />
                Projects
              </h1>
              <p className="text-muted-foreground text-sm">
                Organize your research into projects and collections
              </p>
            </div>
            <Button className="gap-2" onClick={() => setIsNewProjectOpen(true)}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
          </div>

          {/* Toolbar */}
          <div className="mt-4 flex items-center gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="flex gap-6">
          {/* Projects Grid/List */}
          <div className="flex-1">
            {/* Favorites Section */}
            {filteredProjects.some((p) => p.isFavorite) && (
              <div className="mb-8">
                <h2 className="text-muted-foreground mb-4 flex items-center gap-2 text-sm font-bold tracking-wider uppercase">
                  <Star className="h-4 w-4 text-yellow-500" />
                  Favorites
                </h2>
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                      : "space-y-2"
                  }
                >
                  {filteredProjects
                    .filter((p) => p.isFavorite)
                    .map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        viewMode={viewMode}
                        isSelected={selectedProject?.id === project.id}
                        onSelect={() => setSelectedProject(project)}
                        onToggleFavorite={() =>
                          handleToggleFavorite(project.id)
                        }
                        onDelete={() => handleDeleteProject(project.id)}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* All Projects */}
            <div>
              <h2 className="text-muted-foreground mb-4 text-sm font-bold tracking-wider uppercase">
                All Projects ({filteredProjects.length})
              </h2>
              {filteredProjects.length > 0 ? (
                <div
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                      : "space-y-2"
                  }
                >
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      viewMode={viewMode}
                      isSelected={selectedProject?.id === project.id}
                      onSelect={() => setSelectedProject(project)}
                      onToggleFavorite={() => handleToggleFavorite(project.id)}
                      onDelete={() => handleDeleteProject(project.id)}
                    />
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-muted-foreground p-8 text-center">
                    <FolderOpen className="mx-auto mb-3 h-12 w-12 opacity-30" />
                    <p className="font-medium">No projects yet</p>
                    <p className="mt-1 text-sm">
                      Create your first project to organize your research.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Collections Shelf */}
          {selectedProject && (
            <div className="w-80 shrink-0">
              <Card className="sticky top-6">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: selectedProject.color }}
                      />
                      {selectedProject.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setSelectedProject(null)}
                    >
                      ✕
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {selectedProject.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Share2 className="text-muted-foreground h-4 w-4" />
                      <span>{selectedProject.graphCount} graphs</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="text-muted-foreground h-4 w-4" />
                      <span>{selectedProject.collectionCount} collections</span>
                    </div>
                  </div>

                  <h4 className="text-muted-foreground mb-3 text-xs font-bold tracking-wider uppercase">
                    Collections
                  </h4>

                  {projectCollections.length > 0 ? (
                    <div className="space-y-2">
                      {projectCollections.map((collection) => (
                        <div
                          key={collection.id}
                          className="bg-muted/50 hover:bg-muted rounded-lg p-3 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              href={`/explore?collection=${collection.id}`}
                              className="min-w-0 flex-1"
                            >
                              <div className="text-sm font-medium">
                                {collection.title}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                {collection.paperCount} papers &bull;{" "}
                                {collection.createdAt}
                                {collection.watchEnabled && (
                                  <>
                                    {" "}
                                    &bull; Weekly digest
                                    {collection.lastDigestAt
                                      ? ` · last checked ${new Date(collection.lastDigestAt).toLocaleDateString()}`
                                      : " · not sent yet"}
                                  </>
                                )}
                              </div>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={async () => {
                                const next = !collection.watchEnabled;
                                await setCollectionWatch(collection.id, next);
                                setCollections((prev) =>
                                  prev.map((item) =>
                                    item.id === collection.id
                                      ? { ...item, watchEnabled: next }
                                      : item,
                                  ),
                                );
                              }}
                              title={
                                collection.watchEnabled
                                  ? "Stop weekly citation digest"
                                  : "Watch weekly for new citing works"
                              }
                            >
                              {collection.watchEnabled ? (
                                <Bell className="text-primary h-4 w-4" />
                              ) : (
                                <BellOff className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => setImportCollection(collection)}
                              title="Import papers"
                            >
                              <FileUp className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-4 text-center text-sm">
                      No collections yet
                    </p>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full gap-2"
                    onClick={handleAddCollection}
                  >
                    <Plus className="h-4 w-4" />
                    Add Collection
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <CreateProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        onSubmit={handleCreateProject}
      />

      {importCollection && (
        <ImportPapersDialog
          open={Boolean(importCollection)}
          onOpenChange={(open) => {
            if (!open) setImportCollection(null);
          }}
          collectionId={importCollection.id}
          collectionTitle={importCollection.title}
          onImported={(result) => {
            setCollections((prev) =>
              prev.map((collection) =>
                collection.id === importCollection.id
                  ? {
                      ...collection,
                      paperCount: result.collectionPaperCount,
                    }
                  : collection,
              ),
            );
          }}
        />
      )}
    </div>
  );
}

function ProjectCard({
  project,
  viewMode,
  isSelected,
  onSelect,
  onToggleFavorite,
  onDelete,
}: {
  project: ProjectData;
  viewMode: "grid" | "list";
  isSelected: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
}) {
  if (viewMode === "list") {
    return (
      <div
        onClick={onSelect}
        className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 transition-all ${
          isSelected
            ? "bg-primary/5 border-primary/30"
            : "bg-card hover:bg-muted/50 border-border"
        }`}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: project.color + "20" }}
        >
          <FolderOpen className="h-5 w-5" style={{ color: project.color }} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{project.title}</h3>
          <p className="text-muted-foreground truncate text-xs">
            {project.description}
          </p>
        </div>
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          <Badge variant="secondary">{project.graphCount} graphs</Badge>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {project.lastModified}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          {project.isFavorite ? (
            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
          ) : (
            <StarOff className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <Card
      onClick={onSelect}
      className={`cursor-pointer overflow-hidden transition-all ${
        isSelected ? "ring-primary ring-2" : "hover:shadow-md"
      }`}
    >
      <div className="h-2" style={{ backgroundColor: project.color }} />
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{ backgroundColor: project.color + "20" }}
          >
            <FolderOpen className="h-5 w-5" style={{ color: project.color }} />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onToggleFavorite}>
                {project.isFavorite ? (
                  <>
                    <StarOff className="mr-2 h-4 w-4" />
                    Remove from favorites
                  </>
                ) : (
                  <>
                    <Star className="mr-2 h-4 w-4" />
                    Add to favorites
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <h3 className="mt-3 font-medium">{project.title}</h3>
        <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
          {project.description}
        </p>

        <div className="text-muted-foreground mt-4 flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <Share2 className="h-3 w-3" />
            {project.graphCount}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {project.collectionCount}
          </span>
          <span className="ml-auto flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {project.lastModified}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
