import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

interface SourcePreviewModalProps {
  source: any;
  isOpen: boolean;
  onClose: () => void;
}

const extractVideoId = (url: string) => {
  const match = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return match ? match[1] : null;
};

const SourcePreviewModal = ({ source, isOpen, onClose }: SourcePreviewModalProps) => {
  if (!source) return null;

  const renderPreview = () => {
    switch (source.source_type) {
      case 'youtube':
        const videoId = extractVideoId(source.source_url);
        return videoId ? (
          <div className="space-y-4">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="w-full h-96 rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            {source.content && (
              <div className="max-h-60 overflow-y-auto border-t pt-4">
                <h4 className="font-semibold mb-2">Transcript</h4>
                <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {source.content.slice(0, 2000)}...
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Invalid YouTube URL</p>
        );
      
      case 'pdf':
        return (
          <div className="h-96 overflow-y-auto border rounded-lg p-4">
            <p className="text-sm whitespace-pre-wrap">{source.content}</p>
          </div>
        );
      
      case 'website':
        return (
          <div className="space-y-4">
            <a 
              href={source.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Open Website
            </a>
            <div className="h-80 overflow-y-auto border rounded-lg p-4">
              <p className="text-sm whitespace-pre-wrap">
                {source.content?.slice(0, 3000) || "No content available"}
                {source.content?.length > 3000 && "..."}
              </p>
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className="h-96 overflow-y-auto border rounded-lg p-4">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {source.content}
            </pre>
          </div>
        );
      
      default:
        return <p className="text-sm text-muted-foreground">Preview not available</p>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{source.source_name}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto">
          {renderPreview()}
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SourcePreviewModal;
