import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Youtube, Globe } from "lucide-react";

interface SourcePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: {
    id: string;
    title: string;
    type: string;
    content?: string;
    url?: string;
    metadata?: any;
  } | null;
}

export const SourcePreviewModal = ({ open, onOpenChange, source }: SourcePreviewModalProps) => {
  if (!source) return null;

  const getIcon = () => {
    switch (source.type) {
      case "youtube":
        return <Youtube className="w-5 h-5 text-red-500" />;
      case "web":
        return <Globe className="w-5 h-5 text-blue-500" />;
      default:
        return <FileText className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getIcon()}
            <div className="flex-1">
              <DialogTitle className="text-xl">{source.title}</DialogTitle>
              <Badge variant="outline" className="mt-1">{source.type}</Badge>
            </div>
          </div>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {source.type === "youtube" && source.url && (
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={`https://www.youtube.com/embed/${source.url.split('v=')[1]?.split('&')[0]}`}
                  className="w-full h-full"
                  allowFullScreen
                  title={source.title}
                />
              </div>
            )}
            
            {source.content && (
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                  {source.content.substring(0, 2000)}
                  {source.content.length > 2000 && "..."}
                </pre>
              </div>
            )}
            
            {source.url && source.type === "web" && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Source URL:</p>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline text-sm"
                >
                  {source.url}
                </a>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
