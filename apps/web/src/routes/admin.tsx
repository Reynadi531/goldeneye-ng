import { useState, useCallback, useEffect } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Upload,
  Layers,
  MapPin,
  Pentagon,
  Users,
  Trash2,
  Shield,
  Activity,
  BarChart3,
  ChevronRight,
  Database,
  Calendar,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { getLayers, deleteLayer, type LayerRow } from "@/lib/api";
import { Button } from "@goldeneye-ng/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@goldeneye-ng/ui/components/card";
import ShpUploader from "@/components/upload/ShpUploader";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

type Tab = "overview" | "data" | "users" | "activity";

export const Route = createFileRoute("/admin")({
  component: AdminDashboard,
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession();
    if (!session) {
      throw redirect({ to: "/login" });
    }
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") {
      throw redirect({ to: "/" });
    }
  },
});

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [layers, setLayers] = useState<LayerRow[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showUploader, setShowUploader] = useState(false);
  const [activities, setActivities] = useState<
    { id: string; action: string; detail: string; timestamp: Date }[]
  >([]);

  // Load layers from DB on mount
  useEffect(() => {
    getLayers()
      .then(setLayers)
      .catch(() => toast.error("Failed to load layer data"));
  }, []);

  const handleDataLoaded = useCallback((layer: LayerRow) => {
    setLayers((prev) => [...prev, layer]);
    setShowUploader(false);

    const newActivity = {
      id: crypto.randomUUID(),
      action: "import",
      detail: `Imported layer "${layer.name}" (${layer.featureCount} features)`,
      timestamp: new Date(),
    };
    setActivities((prev) => [newActivity, ...prev]);
  }, []);

  const handleDeleteLayer = useCallback(
    async (id: string) => {
      const layer = layers.find((l) => l.id === id);
      try {
        await deleteLayer(id);
        setLayers((prev) => prev.filter((l) => l.id !== id));
        const newActivity = {
          id: crypto.randomUUID(),
          action: "delete",
          detail: `Deleted layer: "${layer?.name || id}"`,
          timestamp: new Date(),
        };
        setActivities((prev) => [newActivity, ...prev]);
        toast.success("Layer deleted successfully");
      } catch {
        toast.error("Failed to delete layer");
      }
    },
    [layers],
  );

  const handleUpdateUserRole = useCallback((userId: string, newRole: string) => {
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));

    const newActivity = {
      id: crypto.randomUUID(),
      action: "update",
      detail: `Changed user role to ${newRole}`,
      timestamp: new Date(),
    };
    setActivities((prev) => [newActivity, ...prev]);
    toast.success("User role updated");
  }, []);

  const stats = {
    totalLayers: layers.length,
    totalFeatures: layers.reduce((sum, l) => sum + l.featureCount, 0),
    points: layers.reduce((sum, l) => sum + l.pointCount, 0),
    polygons: layers.reduce((sum, l) => sum + l.polygonCount, 0),
    totalUsers: users.length,
    admins: users.filter((u) => u.role === "admin").length,
  };

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
    { id: "data" as const, label: "Data Management", icon: Database },
    { id: "users" as const, label: "Users", icon: Users },
    { id: "activity" as const, label: "Activity", icon: Activity },
  ];

  return (
    <div className="flex h-full">
      <div className="w-64 border-r bg-card p-4 flex flex-col">
        <div className="flex items-center gap-2 px-2 py-3 mb-4">
          <Shield className="w-5 h-5 text-yellow-500" />
          <span className="font-semibold">Admin Dashboard</span>
        </div>

        <nav className="space-y-1 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="pt-4 border-t">
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => (window.location.href = "/")}
          >
            <ChevronRight className="w-4 h-4" />
            Back to Map
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Dashboard Overview</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Total Layers</CardTitle>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalLayers}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.totalFeatures} total features
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Features</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalFeatures}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.points} points, {stats.polygons} polygons
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Points</CardTitle>
                  <MapPin className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.points}</div>
                  <p className="text-xs text-muted-foreground">Point locations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Polygons</CardTitle>
                  <Pentagon className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.polygons}</div>
                  <p className="text-xs text-muted-foreground">Mining areas</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common admin tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    className="w-full justify-start gap-2"
                    onClick={() => setShowUploader(true)}
                  >
                    <Upload className="w-4 h-4" />
                    Import SHP Data
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("data")}
                  >
                    <Layers className="w-4 h-4" />
                    Manage Layers
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setActiveTab("users")}
                  >
                    <Users className="w-4 h-4" />
                    Manage Users
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest admin actions</CardDescription>
                </CardHeader>
                <CardContent>
                  {activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  ) : (
                    <div className="space-y-2">
                      {activities.slice(0, 5).map((activity) => (
                        <div key={activity.id} className="flex items-center gap-2 text-sm">
                          <Activity className="w-4 h-4 text-muted-foreground" />
                          <span className="flex-1">{activity.detail}</span>
                          <span className="text-xs text-muted-foreground">
                            {activity.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {showUploader && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="relative">
                  <ShpUploader
                    onDataLoaded={handleDataLoaded}
                    onClose={() => setShowUploader(false)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "data" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Data Management</h2>
              <Button onClick={() => setShowUploader(true)} className="gap-2">
                <Upload className="w-4 h-4" />
                Import SHP
              </Button>
            </div>

            {layers.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Layers className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No layers imported yet</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowUploader(true)}>
                    Import your first layer
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {layers.map((layer) => {
                  return (
                    <Card key={layer.id}>
                      <CardContent className="flex items-center justify-between py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <Layers className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{layer.name}</p>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Database className="w-3 h-3" />
                                {layer.featureCount} features
                              </span>
                              {layer.pointCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-red-500" />
                                  {layer.pointCount}
                                </span>
                              )}
                              {layer.polygonCount > 0 && (
                                <span className="flex items-center gap-1">
                                  <Pentagon className="w-3 h-3 text-red-500" />
                                  {layer.polygonCount}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(layer.importedAt).toLocaleDateString()}
                              </span>
                            </div>
                            {layer.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {layer.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteLayer(layer.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            {showUploader && (
              <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
                <div className="relative">
                  <ShpUploader
                    onDataLoaded={handleDataLoaded}
                    onClose={() => setShowUploader(false)}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">User Management</h2>

            {users.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No users found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {users.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Users className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                          className="px-3 py-2 rounded-lg border bg-background text-sm"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Activity Log</h2>

            {activities.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Activity className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No activity recorded yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-4">
                        <div className="w-2 h-2 rounded-full bg-primary mt-2" />
                        <div className="flex-1">
                          <p className="text-sm">{activity.detail}</p>
                          <p className="text-xs text-muted-foreground">
                            {activity.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
