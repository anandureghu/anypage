
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  BookmarkPlus, 
  ArrowLeft, 
  ZoomIn, 
  ZoomOut,
  RotateCw
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

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
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [bookmarks, setBookmarks] = useState<BookmarkType[]>([]);
  const [showBookmarkDialog, setShowBookmarkDialog] = useState(false);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(100);

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
      console.log('Loading PDF with ID:', id);
      
      // Get PDF metadata
      const { data: pdfData, error: pdfError } = await supabase
        .from('pdfs')
        .select('*')
        .eq('id', id)
        .single();

      if (pdfError) {
        console.error('Error loading PDF metadata:', pdfError);
        throw pdfError;
      }

      console.log('PDF metadata loaded:', pdfData);
      setPdf(pdfData);
      setCurrentPage(pdfData.current_page || 1);

      // Get PDF file URL
      const { data: urlData } = supabase.storage
        .from('pdfs')
        .getPublicUrl(pdfData.file_path);

      console.log('PDF URL:', urlData.publicUrl);
      setPdfUrl(urlData.publicUrl);

      // Update last opened time
      await supabase
        .from('pdfs')
        .update({ last_opened: new Date().toISOString() })
        .eq('id', id);

    } catch (error: any) {
      console.error('Error loading PDF:', error);
      toast({
        title: "Error",
        description: "Failed to load PDF",
        variant: "destructive",
      });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const loadBookmarks = async () => {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('pdf_id', id)
        .order('page_number', { ascending: true });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error: any) {
      console.error('Error loading bookmarks:', error);
    }
  };

  const updateReadingProgress = async () => {
    if (!pdf || !user) return;

    try {
      // Update PDF current page
      await supabase
        .from('pdfs')
        .update({ current_page: currentPage })
        .eq('id', pdf.id);

      // Update or insert reading progress
      await supabase
        .from('reading_progress')
        .upsert({
          user_id: user.id,
          pdf_id: pdf.id,
          current_page: currentPage,
          total_pages: pdf.total_pages,
          last_read: new Date().toISOString()
        });

      console.log('Reading progress updated:', currentPage);
    } catch (error: any) {
      console.error('Error updating reading progress:', error);
    }
  };

  const createBookmark = async () => {
    if (!pdf || !user || !bookmarkTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          pdf_id: pdf.id,
          page_number: currentPage,
          title: bookmarkTitle.trim(),
          note: bookmarkNote.trim() || null
        });

      if (error) throw error;

      toast({
        title: "Bookmark saved!",
        description: `Page ${currentPage} bookmarked successfully`,
      });

      setShowBookmarkDialog(false);
      setBookmarkTitle('');
      setBookmarkNote('');
      loadBookmarks();
    } catch (error: any) {
      console.error('Error creating bookmark:', error);
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

  const handleZoom = (direction: 'in' | 'out') => {
    if (direction === 'in') {
      setZoom(prev => Math.min(prev + 25, 200));
    } else {
      setZoom(prev => Math.max(prev - 25, 50));
    }
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
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Library
            </Button>
            <h1 className="text-xl font-semibold">{pdf.title}</h1>
          </div>
          <div className="flex items-center gap-2">
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
                      Page {currentPage} of {pdf.total_pages || '?'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={pdf.total_pages ? currentPage >= pdf.total_pages : false}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleZoom('out')}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm min-w-[60px] text-center">{zoom}%</span>
                    <Button variant="outline" size="sm" onClick={() => handleZoom('in')}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[600px] border rounded-lg overflow-auto bg-gray-50">
                  {pdfUrl ? (
                    <iframe
                      src={`${pdfUrl}#page=${currentPage}&zoom=${zoom}`}
                      className="w-full h-full"
                      title={pdf.title}
                    />
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
                    No bookmarks yet. Click the bookmark button to save your current page.
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
                          <h4 className="font-medium text-sm">{bookmark.title}</h4>
                          <Badge variant="secondary">
                            Page {bookmark.page_number}
                          </Badge>
                        </div>
                        {bookmark.note && (
                          <p className="text-xs text-muted-foreground">{bookmark.note}</p>
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
                <Button onClick={createBookmark} disabled={!bookmarkTitle.trim()}>
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
