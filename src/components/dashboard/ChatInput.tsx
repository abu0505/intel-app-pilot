import { useState, useRef, useLayoutEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  disabled?: boolean;
  wrapperClass?: string;
  minHeight?: string;
  voiceInput?: React.ReactNode;
  selectedSourceCount?: number;
}

export const ChatInput = ({ 
  value, 
  onChange, 
  onSubmit, 
  disabled, 
  wrapperClass,
  minHeight = "120px",
  voiceInput,
  selectedSourceCount = 0
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);
  const [isComposing, setIsComposing] = useState(false);

  // Cursor position save KAREGA PEHLE
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    cursorPositionRef.current = e.target.selectionStart;
    onChange(e.target.value);
  }, [onChange]);

  // useLayoutEffect - SYNCHRONOUSLY restore (requestAnimationFrame ke bajaaye)
  useLayoutEffect(() => {
    if (textareaRef.current && !isComposing) {
      const position = cursorPositionRef.current;
      textareaRef.current.setSelectionRange(position, position);
    }
  }, [value, isComposing]);

  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = (e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setIsComposing(false);
    cursorPositionRef.current = e.currentTarget.selectionStart;
  };

  return (
    <div className={wrapperClass || 'max-w-2xl mx-auto px-4 py-4'}>
      <form className="relative" onSubmit={onSubmit}>
        <div className="flex flex-col items-stretch bg-muted/30 border border-border/50 rounded-3xl p-4 focus-within:border-primary/50 transition-colors">
          <div>
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
                  e.preventDefault();
                  onSubmit(e as any);
                }
              }}
              placeholder="I have access to all your uploaded sources. Ask anything about your study materials..."
              className="flex-1 resize-none bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/60 px-1"
              disabled={disabled}
              autoFocus
              dir="ltr"
            />
          </div>
          <div className="flex justify-end items-center gap-2 pt-2">
            {selectedSourceCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {selectedSourceCount} {selectedSourceCount === 1 ? 'source' : 'sources'}
              </span>
            )}
            {voiceInput}
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={disabled || !value.trim()}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
