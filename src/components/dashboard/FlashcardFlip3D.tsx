import { useState } from "react";
import { cn } from "@/lib/utils";

interface FlashcardFlip3DProps {
  front: string;
  back: string;
  className?: string;
}

export const FlashcardFlip3D = ({ front, back, className }: FlashcardFlip3DProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div 
      className={cn("relative w-full h-[300px] cursor-pointer perspective-1000", className)}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div 
        className={cn(
          "relative w-full h-full transition-transform duration-600 transform-style-3d",
          isFlipped && "rotate-y-180"
        )}
      >
        {/* Front */}
        <div className="absolute w-full h-full backface-hidden flex items-center justify-center p-8 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border-2 border-primary/20">
          <p className="text-2xl font-semibold text-center">{front}</p>
        </div>
        
        {/* Back */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 flex items-center justify-center p-8 bg-gradient-to-br from-secondary/5 to-secondary/10 rounded-lg border-2 border-secondary/20">
          <p className="text-xl text-center">{back}</p>
        </div>
      </div>
      
      <p className="text-center mt-2 text-sm text-muted-foreground">
        Click to flip
      </p>
    </div>
  );
};
