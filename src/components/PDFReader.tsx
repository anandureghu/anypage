import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkPlus,
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDF {
  id: string;
  title: string;
  file_path: string;
  total_pages: number | null;
  current_page: number;
}

interface BookmarkType {
  id: string;
  page_number: number;
  title: string;
  note: string | null;
  created_at: string;
}

const PDFReader = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [pdf, setPdf] = useState<PDF | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState("");
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [pdfError, setPdfError] = useState(false);
  const [pdfScale, setPdfScale] = useState(1.0); // Renamed from zoom, default to 1.0 for scale
  const [numPages, setNumPages] = useState<number | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    loadPDF();
    loadBookmarks();
  }, [user, id]);

  useEffect(() => {
    // Update reading progress when page changes
    if (pdf && currentPage !== pdf.current_page) {
      updateReadingProgress();
    }
  }, [currentPage, pdf]);

  const loadPDF = async () => {
    try {
      // Get PDF metadata
      const { data: pdfData, error: pdfError } = await supabase
        .from("pdfs")
        .select("*")
        .eq("id", id)
        .single();

      if (pdfError) {
        console.error("Error loading PDF metadata:", pdfError);
        throw pdfError;
      }

      setPdf(pdfData);
      setCurrentPage(pdfData.current_page || 1);

      // Get PDF file URL and properly encode it
      const { data: urlData } = supabase.storage
        .from("pdfs")
        .getPublicUrl(pdfData.file_path);

      // Properly encode the URL to handle special characters
      const encodedUrl = urlData.publicUrl
        .split("/")
        .map((segment, index) => {
          // Don't encode the protocol and domain parts
          if (index < 3) return segment;
          return encodeURIComponent(decodeURIComponent(segment));
        })
        .join("/");

      // Set the URL and assume it might have CORS issues
      setPdfUrl(encodedUrl);
      setPdfError(false);

      // Update last opened time
      await supabase
        .from("pdfs")
        .update({ last_opened: new Date().toISOString() })
        .eq("id", id);
    } catch (error: unknown) {
      console.error("Error loading PDF:", error);
      toast({
        title: "Error",
        description: "Failed to load PDF",
        variant: "destructive",
      });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    try {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("pdf_id", id)
        .order("page_number", { ascending: true });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error: unknown) {
      console.error("Error loading bookmarks:", error);
    }
  };

  const updateReadingProgress = async () => {
    if (!pdf || !user) return;

    try {
      // Update PDF current page
      await supabase
        .from("pdfs")
        .update({ current_page: currentPage })
        .eq("id", pdf.id);

      // Update or insert reading progress
      await supabase.from("reading_progress").upsert({
        user_id: user.id,
        pdf_id: pdf.id,
        current_page: currentPage,
        total_pages: pdf.total_pages,
        last_read: new Date().toISOString(),
      });
    } catch (error: unknown) {
      console.error("Error updating reading progress:", error);
    }
  };

  const createBookmark = async () => {
    if (!pdf || !user || !bookmarkTitle.trim()) return;

    try {
      const { error } = await supabase.from("bookmarks").insert({
        user_id: user.id,
        pdf_id: pdf.id,
        page_number: currentPage,
        title: bookmarkTitle.trim(),
        note: bookmarkNote.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Bookmark saved!",
        description: `Page ${currentPage} bookmarked successfully`,
      });

      setShowBookmarkDialog(false);
      setBookmarkTitle("");
      setBookmarkNote("");
      loadBookmarks();
    } catch (error: unknown) {
      console.error("Error creating bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to create bookmark",
        variant: "destructive",
      });
    }
  };

  const goToBookmark = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handlePageChange = (newPage: number) => {
    if (!pdf) return;
    const maxPage = pdf.total_pages || 1;
    const page = Math.max(1, Math.min(newPage, maxPage));
    setCurrentPage(page);
  };

  const handleZoom = (direction: "in" | "out") => {
    const zoomStep = 0.25;
    const minScale = 0.5;
    const maxScale = 3.0;

    if (direction === "in") {
      setPdfScale((prev) => Math.min(prev + zoomStep, maxScale));
    } else {
      setPdfScale((prev) => Math.max(prev - zoomStep, minScale));
    }
  };

  const openInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  };

  const downloadPDF = () => {
    if (pdfUrl && pdf) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = pdf.title + ".pdf";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const onDocumentLoadSuccess = ({
    numPages: nextNumPages,
  }: {
    numPages: number;
  }) => {
    setNumPages(nextNumPages);
    setPdfError(false);
    // Potentially update total_pages in DB if it's null or different
    if (pdf && (pdf.total_pages === null || pdf.total_pages !== nextNumPages)) {
      supabase
        .from("pdfs")
        .update({ total_pages: nextNumPages })
        .eq("id", pdf.id)
        .then(({ error }) => {
          if (error) console.error("Error updating total_pages in DB:", error);
          else if (pdf) setPdf({ ...pdf, total_pages: nextNumPages });
        });
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("Error while loading document: ", error);
    setPdfError(true);
    toast({
      title: "Error loading PDF",
      description: error.message || "Could not load the PDF file.",
      variant: "destructive",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>Loading PDF...</div>
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div>PDF not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
            <h1 className="text-xl font-semibold">{pdf.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openInNewTab}
              disabled={!pdfUrl}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Tab
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadPDF}
              disabled={!pdfUrl}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBookmarkDialog(true)}
            >
              <BookmarkPlus className="h-4 w-4 mr-2" />
              Bookmark
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* PDF Viewer */}
          <div className="flex-1">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {numPages || pdf.total_pages || "?"}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={
                        numPages
                          ? currentPage >= numPages
                          : pdf.total_pages
                          ? currentPage >= pdf.total_pages
                          : true
                      }
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleZoom("out")}
                      disabled={pdfScale <= 0.5}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm min-w-[60px] text-center">
                      {Math.round(pdfScale * 100)}%
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleZoom("in")}
                      disabled={pdfScale >= 3.0}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[calc(100vh-200px)] border rounded-lg overflow-auto bg-gray-50 flex justify-center">
                  {" "}
                  {/* Adjusted height and centering */}
                  {pdfError ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 p-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold mb-2">
                          PDF Preview Unavailable
                        </h3>
                        <p className="text-sm mb-4">
                          The PDF could not be displayed. This might be due to
                          network issues, file corruption, or format
                          incompatibility. You can try downloading it or opening
                          it in a new tab.
                        </p>
                        <div className="flex gap-2 justify-center">
                          <Button onClick={downloadPDF} disabled={!pdfUrl}>
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                          <Button
                            variant="outline"
                            onClick={openInNewTab}
                            disabled={!pdfUrl}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open in New Tab
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : pdfUrl ? (
                    <Document
                      file={pdfUrl}
                      onLoadSuccess={onDocumentLoadSuccess}
                      onError={onDocumentLoadError}
                      loading={
                        <div className="flex items-center justify-center h-full">
                          Loading PDF document...
                        </div>
                      }
                      className="flex justify-center" // Centering Document component itself
                    >
                      <Page
                        pageNumber={currentPage}
                        scale={pdfScale}
                        renderTextLayer={true}
                        renderAnnotationLayer={true}
                        loading={
                          <div className="flex items-center justify-center h-full">
                            Loading page {currentPage}...
                          </div>
                        }
                      />
                    </Document>
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      Loading PDF content...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="w-80">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bookmark className="h-5 w-5" />
                  Bookmarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bookmarks.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No bookmarks yet. Click the bookmark button to save your
                    current page.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {bookmarks.map((bookmark) => (
                      <div
                        key={bookmark.id}
                        className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => goToBookmark(bookmark.page_number)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm">
                            {bookmark.title}
                          </h4>
                          <Badge variant="secondary">
                            Page {bookmark.page_number}
                          </Badge>
                        </div>
                        {bookmark.note && (
                          <p className="text-xs text-muted-foreground">
                            {bookmark.note}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bookmark Dialog */}
      {showBookmarkDialog && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create Bookmark</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={bookmarkTitle}
                  onChange={(e) => setBookmarkTitle(e.target.value)}
                  placeholder="Enter bookmark title"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Note (optional)</label>
                <Textarea
                  value={bookmarkNote}
                  onChange={(e) => setBookmarkNote(e.target.value)}
                  placeholder="Add a note about this page"
                  className="mt-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowBookmarkDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={createBookmark}
                  disabled={!bookmarkTitle.trim()}
                >
                  Save Bookmark
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PDFReader;
