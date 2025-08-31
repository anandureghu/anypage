import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileText,
  BookOpen,
  Bookmark,
  User,
  LogOut,
  Plus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Logo from "./shared/logo";

interface PDF {
  id: string;
  title: string;
  file_name: string;
  file_size: number | null;
  total_pages: number | null;
  upload_date: string;
  last_opened: string | null;
  current_page: number;
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [pdfs, setPdfs] = useState<PDF[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      console.log("User not authenticated, redirecting to auth");
      window.location.href = "/auth";
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (user) {
      console.log("User authenticated, fetching PDFs");
      fetchPDFs();
    }
  }, [user]);

  const fetchPDFs = async () => {
    try {
      console.log("Fetching PDFs for user:", user?.email);
      const { data, error } = await supabase
        .from("pdfs")
        .select("*")
        .order("last_opened", { ascending: false, nullsFirst: false })
        .order("upload_date", { ascending: false });

      if (error) {
        console.error("Error fetching PDFs:", error);
        throw error;
      }

      console.log("Fetched PDFs:", data?.length || 0);
      setPdfs(data || []);
    } catch (error) {
      console.error("Error in fetchPDFs:", error);
      toast({
        title: "Error",
        description: "Failed to load PDFs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't render if still loading auth or if user is not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== "application/pdf") {
      toast({
        title: "Error",
        description: "Please select a PDF file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${user.id}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("pdfs")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("pdfs").insert({
        user_id: user.id,
        title: file.name.replace(".pdf", ""),
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
      });

      if (dbError) throw dbError;

      toast({
        title: "Success!",
        description: "PDF uploaded successfully",
      });

      fetchPDFs();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload PDF",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const openPDF = (pdf: PDF) => {
    window.location.href = `/reader/${pdf.id}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.user_metadata?.full_name || user.email}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64">
            <nav className="space-y-2">
              <Button
                variant={activeTab === "home" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("home")}
              >
                <FileText className="h-4 w-4 mr-2" />
                My PDFs
              </Button>
              <Button
                variant={activeTab === "bookmarks" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("bookmarks")}
              >
                <Bookmark className="h-4 w-4 mr-2" />
                Bookmarks
              </Button>
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("profile")}
              >
                <User className="h-4 w-4 mr-2" />
                Profile
              </Button>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {activeTab === "home" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold">My PDF Library</h2>
                  <div className="flex items-center gap-4">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="pdf-upload"
                      disabled={uploading}
                    />
                    <label htmlFor="pdf-upload">
                      <Button asChild disabled={uploading}>
                        <span className="cursor-pointer">
                          {uploading ? (
                            "Uploading..."
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              Upload PDF
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">Loading your PDFs...</div>
                ) : pdfs.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-semibold mb-2">
                        No PDFs yet
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Upload your first PDF to get started with Rempd
                      </p>
                      <label htmlFor="pdf-upload">
                        <Button asChild>
                          <span className="cursor-pointer">
                            <Plus className="h-4 w-4 mr-2" />
                            Upload Your First PDF
                          </span>
                        </Button>
                      </label>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {pdfs.map((pdf) => (
                      <Card
                        key={pdf.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <CardContent
                          className="p-6"
                          onClick={() => openPDF(pdf)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg mb-2">
                                {pdf.title}
                              </h3>
                              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                                <span>{formatFileSize(pdf.file_size)}</span>
                                {pdf.total_pages && (
                                  <span>{pdf.total_pages} pages</span>
                                )}
                                <span>
                                  Uploaded{" "}
                                  {formatDistanceToNow(
                                    new Date(pdf.upload_date),
                                    { addSuffix: true }
                                  )}
                                </span>
                              </div>
                              {pdf.last_opened && (
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary">
                                    Page {pdf.current_page}
                                  </Badge>
                                  <span className="text-sm text-muted-foreground">
                                    Last read{" "}
                                    {formatDistanceToNow(
                                      new Date(pdf.last_opened),
                                      { addSuffix: true }
                                    )}
                                  </span>
                                </div>
                              )}
                            </div>
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "bookmarks" && (
              <div>
                <h2 className="text-3xl font-bold mb-6">My Bookmarks</h2>
                <Card>
                  <CardContent className="p-6 text-center">
                    <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Your bookmarks will appear here when you start reading
                      PDFs
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "profile" && (
              <div>
                <h2 className="text-3xl font-bold mb-6">Profile</h2>
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>
                      Your Rempd account details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Full Name</label>
                      <p className="text-sm text-muted-foreground">
                        {user.user_metadata?.full_name || "Not set"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">
                        Member Since
                      </label>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
