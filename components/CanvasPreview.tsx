'use client';

import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { useEditor, roundRect, buildOutlineFilter, resolveOutlineColor } from '@/hooks/useEditor';  // Add this import
import { SHAPES } from '@/constants/shapes';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { DrawingPoint } from '@/types/editor';  // Add this import
import { InteractiveTextOverlay } from './InteractiveTextOverlay';

export function CanvasPreview() {
  const { 
    image, 
    textSets, 
    shapeSets, 
    imageEnhancements, 
    hasTransparentBackground, 
    foregroundPosition, 
    hasChangedBackground, 
    clonedForegrounds,
    backgroundImages,  // Add this line
    backgroundColor,
    foregroundSize,
    downloadImage, // Keep this
    isDrawingMode,
    drawingTool,
    drawingSize,
    drawingColor,
    drawings,
    addDrawingPath,
    foregroundOutline
  } = useEditor();
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasRect, setCanvasRect] = useState<DOMRect | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasOriginalSize, setCanvasOriginalSize] = useState({ width: 100, height: 100 });
  const [fgImageSize, setFgImageSize] = useState({ width: 100, height: 100 });

  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const fgImageRef = useRef<HTMLImageElement | null>(null);
  const bgImagesRef = useRef<Map<number, HTMLImageElement>>(new Map()); // Add this line
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderRequestRef = useRef<number | undefined>(undefined);

  // Initialize a reusable temp canvas
  useEffect(() => {
    tempCanvasRef.current = document.createElement('canvas');
    return () => {
      tempCanvasRef.current = null;
    };
  }, []);
  const { toast } = useToast();
  const { user } = useAuth();

  const [currentPath, setCurrentPath] = useState<DrawingPoint[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);

  // Memoize the filter string
  const filterString = useMemo(() => `
    brightness(${imageEnhancements.brightness}%)
    contrast(${imageEnhancements.contrast}%)
    saturate(${imageEnhancements.saturation}%)
    opacity(${100 - imageEnhancements.fade}%)
  `, [imageEnhancements]);

  // Add this new function to handle background image loading
  const loadBackgroundImage = useCallback((url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.src = url;
    });
  }, []);

  // Add this effect to handle background images loading
  useEffect(() => {
    const loadImages = async () => {
      const newBgImages = new Map();
      
      for (const bgImage of backgroundImages) {
        if (!bgImagesRef.current.has(bgImage.id)) {
          const img = await loadBackgroundImage(bgImage.url);
          newBgImages.set(bgImage.id, img);
        } else {
          newBgImages.set(bgImage.id, bgImagesRef.current.get(bgImage.id)!);
        }
      }
      
      bgImagesRef.current = newBgImages;
      render();
    };

    loadImages();
  }, [backgroundImages, loadBackgroundImage]);

  // Memoize expensive calculations
  const calculateScale = useCallback((img: HTMLImageElement, canvas: HTMLCanvasElement) => {
    return Math.min(
      canvas.width / img.width,
      canvas.height / img.height
    );
  }, []);

  // Update canvas rect when canvas size changes
  useEffect(() => {
    const updateRect = () => {
      if (bgCanvasRef.current) {
        const rect = bgCanvasRef.current.getBoundingClientRect();
        
        // Update scale based on actual image dimensions vs displayed dimensions
        if (bgImageRef.current) {
          setCanvasScale(rect.width / bgImageRef.current.width);
        }

        // Only update if dimensions actually changed to avoid infinite loops
        setCanvasRect(prev => {
          if (!prev || prev.width !== rect.width || prev.height !== rect.height || prev.left !== rect.left || prev.top !== rect.top) {
            return rect;
          }
          return prev;
        });
      }
    };

    updateRect();
    
    // Use ResizeObserver for more reliable canvas resize detection
    const observer = new ResizeObserver(() => {
      updateRect();
    });
    
    if (bgCanvasRef.current) {
      observer.observe(bgCanvasRef.current);
    }
    
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('resize', updateRect);
      observer.disconnect();
    };
  }, [foregroundSize, foregroundPosition, image, hasTransparentBackground, hasChangedBackground, isDrawingMode]);

  const render = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    const fgCanvas = fgCanvasRef.current;
    const bgCtx = bgCanvas?.getContext('2d', { alpha: true });
    const fgCtx = fgCanvas?.getContext('2d', { alpha: true });
    
    if (!bgCanvas || !fgCanvas || !bgCtx || !fgCtx || !bgImageRef.current) return;

    // Cancel any pending render
    if (renderRequestRef.current) {
      cancelAnimationFrame(renderRequestRef.current);
    }

    // Schedule next render with high priority
    renderRequestRef.current = requestAnimationFrame(() => {
      // Reset canvas transform and clear
      bgCtx.setTransform(1, 0, 0, 1, 0, 0);
      bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
      fgCtx.setTransform(1, 0, 0, 1, 0, 0);
      fgCtx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);

      // Set canvas size to match background image
      bgCanvas.width = bgImageRef.current!.width;
      bgCanvas.height = bgImageRef.current!.height;
      fgCanvas.width = bgImageRef.current!.width;
      fgCanvas.height = bgImageRef.current!.height;

      // Update canvas rect for the text overlay after setting size
      setCanvasRect(prev => {
        const rect = bgCanvas.getBoundingClientRect();
        if (bgImageRef.current) {
          setCanvasScale(rect.width / bgImageRef.current.width);
        }
        if (!prev || prev.width !== rect.width || prev.height !== rect.height || prev.left !== rect.left || prev.top !== rect.top) {
          return rect;
        }
        return prev;
      });

      // Clear canvas with transparency
      bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
      fgCtx.clearRect(0, 0, fgCanvas.width, fgCanvas.height);

      // First, handle background color if set
      if (backgroundColor) {
        bgCtx.fillStyle = backgroundColor;
        bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
      } else if (hasTransparentBackground) {
        const pattern = bgCtx.createPattern(createCheckerboardPattern(), 'repeat');
        if (pattern) {
          bgCtx.fillStyle = pattern;
          bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);
        }
      } else if (image.background) {
        // Draw background image only if no color is set
        bgCtx.filter = filterString;
        bgCtx.drawImage(bgImageRef.current!, 0, 0);
        bgCtx.filter = 'none';
      }

      // Draw background images
      for (const bgImage of backgroundImages) {
        const img = bgImagesRef.current.get(bgImage.id);
        if (!img) continue;
        
        bgCtx.save();
        
        const x = (bgCanvas.width * bgImage.position.horizontal) / 100;
        const y = (bgCanvas.height * bgImage.position.vertical) / 100;
        
        bgCtx.translate(x, y);
        bgCtx.rotate((bgImage.rotation * Math.PI) / 180);
        
        // Apply tilt
        const tiltXRad = ((bgImage.tiltX || 0) * Math.PI) / 180;
        const tiltYRad = ((bgImage.tiltY || 0) * Math.PI) / 180;
        bgCtx.scale(Math.cos(tiltYRad), Math.cos(tiltXRad));

        bgCtx.globalAlpha = bgImage.opacity;

        const baseSize = Math.min(bgCanvas.width, bgCanvas.height);
        const scale = (baseSize * bgImage.scale) / 100;

        // Use shared temporary canvas to avoid memory allocation in hot loop
        const tempCanvas = tempCanvasRef.current;
        if (!tempCanvas) continue;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) continue;

        // Set temp canvas size to accommodate glow
        const padding = bgImage.glow.intensity * 2;
        tempCanvas.width = scale + padding * 2;
        tempCanvas.height = scale + padding * 2;
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

        // First draw the image
        tempCtx.drawImage(
          img,
          padding,
          padding,
          scale,
          scale
        );

        // Apply rounded corners if needed
        if (bgImage.borderRadius > 0) {
          const radius = (bgImage.borderRadius / 100) * (scale / 2);
          
          tempCtx.globalCompositeOperation = 'destination-in';
          tempCtx.beginPath();
          roundRect(tempCtx, padding, padding, scale, scale, radius);
          tempCtx.fill();
          tempCtx.globalCompositeOperation = 'source-over';
        }

        // Apply glow if intensity > 0
        if (bgImage.glow.intensity > 0) {
          tempCtx.shadowColor = '#ffffff'; // Always white glow
          tempCtx.shadowBlur = bgImage.glow.intensity;
          tempCtx.shadowOffsetX = 0;
          tempCtx.shadowOffsetY = 0;
          
          // Draw it over itself to apply the shadow (simple way without extra canvases)
          tempCtx.drawImage(tempCanvas, 0, 0);
        }

        // Draw the temp canvas onto the main canvas
        bgCtx.drawImage(
          tempCanvas,
          -scale / 2 - padding,
          -scale / 2 - padding,
          scale + padding * 2,
          scale + padding * 2
        );
        
        bgCtx.restore();
      }

      // Draw drawings right after background but before shapes and text
      drawings.forEach(path => {
        drawPath(bgCtx, path.points);
      });

      // Draw current path (active drawing)
      if (currentPath.length > 0) {
        drawPath(bgCtx, currentPath);
      }

      // Draw shapes with consistent scaling
      shapeSets.forEach(shapeSet => {
        bgCtx.save();
        
        const x = (bgCanvas.width * shapeSet.position.horizontal) / 100;
        const y = (bgCanvas.height * shapeSet.position.vertical) / 100;
        
        // Move to position
        bgCtx.translate(x, y);
        
        // Apply rotation
        bgCtx.rotate((shapeSet.rotation * Math.PI) / 180);

        // Apply tilt
        const tiltXRad = ((shapeSet.tiltX || 0) * Math.PI) / 180;
        const tiltYRad = ((shapeSet.tiltY || 0) * Math.PI) / 180;
        bgCtx.scale(Math.cos(tiltYRad), Math.cos(tiltXRad));

        // Calculate scale
        const baseSize = Math.min(bgCanvas.width, bgCanvas.height);
        const scale = (baseSize * (shapeSet.scale / 100)) / 1000;
        
        // Move to center, scale, then move back
        bgCtx.translate(-0.5, -0.5);  // Move to center of shape path
        bgCtx.scale(scale, scale);    // Apply scaling
        bgCtx.translate(0.5, 0.5);    // Move back

        // Add glow effect if enabled
        if (shapeSet.glow?.enabled) {
          bgCtx.shadowColor = shapeSet.glow.color;
          bgCtx.shadowBlur = shapeSet.glow.intensity;
          bgCtx.shadowOffsetX = 0;
          bgCtx.shadowOffsetY = 0;
        }

        // Set opacity
        bgCtx.globalAlpha = shapeSet.opacity;

        // Find shape path and draw
        const shape = SHAPES.find(s => s.value === shapeSet.type);
        if (shape) {
          const path = new Path2D(shape.path);
          
          if (shapeSet.isFilled) {
            bgCtx.fillStyle = shapeSet.color;
            bgCtx.fill(path);
          } else {
            bgCtx.strokeStyle = shapeSet.color;
            bgCtx.lineWidth = shapeSet.strokeWidth || 2;
            bgCtx.stroke(path);
          }
        }
        
        bgCtx.restore();
      });

      // Draw original foreground on fgCanvas
      if (fgImageRef.current) {
        fgCtx.filter = 'none';
        fgCtx.globalAlpha = 1;

        const scale = Math.min(
          fgCanvas.width / fgImageRef.current.width,
          fgCanvas.height / fgImageRef.current.height
        );
        
        const sizeMultiplier = foregroundSize / 100;
        const newWidth = fgImageRef.current.width * scale * sizeMultiplier;
        const newHeight = fgImageRef.current.height * scale * sizeMultiplier;
        
        const x = (fgCanvas.width - newWidth) / 2;
        const y = (fgCanvas.height - newHeight) / 2;

        const outlineEnabled = foregroundOutline.enabled && foregroundOutline.width > 0;
        const outlineColor = outlineEnabled ? resolveOutlineColor(foregroundOutline) : '';

        if (hasTransparentBackground || hasChangedBackground) {
          const offsetX = (fgCanvas.width * foregroundPosition.x) / 100;
          const offsetY = (fgCanvas.height * foregroundPosition.y) / 100;
          // 先画描边（在主体背后），再画主体
          if (outlineEnabled) {
            fgCtx.save();
            fgCtx.filter = buildOutlineFilter(foregroundOutline.width, outlineColor);
            fgCtx.drawImage(fgImageRef.current, x + offsetX, y + offsetY, newWidth, newHeight);
            fgCtx.restore();
          }
          fgCtx.drawImage(fgImageRef.current, x + offsetX, y + offsetY, newWidth, newHeight);
        } else {
          if (outlineEnabled) {
            fgCtx.save();
            fgCtx.filter = buildOutlineFilter(foregroundOutline.width, outlineColor);
            fgCtx.drawImage(fgImageRef.current, x, y, newWidth, newHeight);
            fgCtx.restore();
          }
          fgCtx.drawImage(fgImageRef.current, x, y, newWidth, newHeight);
        }

        // Draw cloned foregrounds
        clonedForegrounds.forEach(clone => {
          const scale = Math.min(
            fgCanvas.width / fgImageRef.current!.width,
            fgCanvas.height / fgImageRef.current!.height
          );
          
          const newWidth = fgImageRef.current!.width * scale * (clone.size / 100);
          const newHeight = fgImageRef.current!.height * scale * (clone.size / 100);
          
          const x = (fgCanvas.width - newWidth) / 2;
          const y = (fgCanvas.height - newHeight) / 2;
          
          const offsetX = (fgCanvas.width * clone.position.x) / 100;
          const offsetY = (fgCanvas.height * clone.position.y) / 100;

          // Save context state before transformations
          fgCtx.save();

          // Move to center point
          fgCtx.translate(x + offsetX + newWidth / 2, y + offsetY + newHeight / 2);
          
          // Apply rotation
          fgCtx.rotate((clone.rotation * Math.PI) / 180);
          
          // Apply flips if needed
          if (clone.flip.horizontal) fgCtx.scale(-1, 1);
          if (clone.flip.vertical) fgCtx.scale(1, -1);
          
          // 先画克隆描边（在主体背后），再画克隆主体
          if (outlineEnabled) {
            fgCtx.save();
            fgCtx.filter = buildOutlineFilter(foregroundOutline.width, outlineColor);
            fgCtx.drawImage(
              fgImageRef.current!,
              -newWidth / 2,
              -newHeight / 2,
              newWidth,
              newHeight
            );
            fgCtx.restore();
          }

          fgCtx.drawImage(
            fgImageRef.current!, 
            -newWidth / 2, 
            -newHeight / 2, 
            newWidth, 
            newHeight
          );

          // Restore context state
          fgCtx.restore();
        });
      }

    });
  }, [textSets, shapeSets, filterString, hasTransparentBackground, hasChangedBackground, foregroundPosition, clonedForegrounds, backgroundImages, backgroundColor, foregroundSize, drawings, currentPath, foregroundOutline]);

  // Cleanup on unmount
  useEffect(() => {
    const currentRenderRequest = renderRequestRef.current;
    const loadedBgImages = new Set([...bgImagesRef.current.values()]);

    return () => {
      if (currentRenderRequest) {
        cancelAnimationFrame(currentRenderRequest);
      }
      // Clean up image references
      loadedBgImages.clear();
      bgImagesRef.current.clear();
      bgImageRef.current = null;
      fgImageRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!hasTransparentBackground && !image.background) return;
    if (hasTransparentBackground && !image.foreground) return;

    // Load appropriate image based on transparency state for background size
    const img = new Image();
    img.src = hasTransparentBackground ? image.foreground! : image.background!;
    img.onload = () => {
      bgImageRef.current = img;
      setCanvasOriginalSize({ width: img.width, height: img.height });
      render();
    };

    // Load foreground image always if available, so it can be drawn with outline
    if (image.foreground) {
      const fgImg = new Image();
      fgImg.src = image.foreground;
      fgImg.onload = () => {
        fgImageRef.current = fgImg;
        setFgImageSize({ width: fgImg.width, height: fgImg.height });
        render();
      };
    } else {
      fgImageRef.current = null;
    }
  }, [image.background, image.foreground, hasTransparentBackground, foregroundPosition, foregroundSize]); // Add foregroundSize here

  useEffect(() => {
    // Load all fonts used in text sets
    const loadFonts = async () => {
      const fontPromises = textSets.map(textSet => {
        // Create proper font string for loading
        const fontString = `${textSet.fontWeight} ${textSet.fontSize}px ${textSet.fontFamily}`;
        return document.fonts.load(fontString);
      });
      await Promise.all(fontPromises);
      render();
    };
    
    loadFonts();
  }, [textSets]);

  // Re-render on text, shape, imageEnhancements, and foregroundPosition changes
  useEffect(() => {
    render();
  }, [
    textSets, 
    shapeSets, 
    imageEnhancements, 
    foregroundPosition, 
    clonedForegrounds, 
    hasChangedBackground, 
    backgroundColor,
    foregroundSize,  // Add foregroundSize here
    foregroundOutline
  ]);

  // Add a useEffect for window resize event
  useEffect(() => {
    const handleResize = () => {
      render();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  // Add a separate effect for drawings
  useEffect(() => {
    if (drawings.length > 0 || currentPath.length > 0) {
      render();
    }
  }, [drawings, currentPath, render]);

  // Add effect to reset currentPath when drawings are cleared
  useEffect(() => {
    if (drawings.length === 0) {
      setCurrentPath([]);
    }
  }, [drawings.length]);

  const handleClick = () => {
    downloadImage(true);
  };

  // Handle drawing interactions
  const handleDrawStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingMode) return;
    
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    setIsDrawing(true);
    const point = getCanvasPoint(e, canvas);
    setCurrentPath([{
      ...point,
      size: drawingSize,
      color: drawingColor
    }]);
  };

  const handleDrawMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isDrawingMode) return;
    
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    const point = getCanvasPoint(e, canvas);
    setCurrentPath(prev => [...prev, {
      ...point,
      size: drawingSize,
      color: drawingColor
    }]);
  };

  const handleDrawEnd = () => {
    if (!isDrawing || !isDrawingMode) return;
    
    if (currentPath.length > 0) {
      addDrawingPath(currentPath);
    }
    setCurrentPath([]);
    setIsDrawing(false);
  };

  // Helper function to draw a path
  const drawPath = (ctx: CanvasRenderingContext2D, points: DrawingPoint[]) => {
    if (points.length < 2) return;
  
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    for (let i = 1; i < points.length; i++) {
      const start = points[i - 1];
      const end = points[i];
  
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
  
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = start.color;
      ctx.lineWidth = start.size;
      ctx.stroke();
    }
  
    ctx.restore();
  };

  // Helper function to get canvas coordinates
  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const getCoordinates = (clientX: number, clientY: number) => ({
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    });

    if ('touches' in e) {
      const touch = e.touches[0];
      return getCoordinates(touch.clientX, touch.clientY);
    }
    
    return getCoordinates(e.clientX, e.clientY);
  };

  // Add cursor indicator for drawing tools
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;

    const updateCursor = (e: MouseEvent) => {
      if (!isDrawingMode) return;

      const cursorCanvas = document.createElement('canvas');
      cursorCanvas.width = drawingSize * 2;
      cursorCanvas.height = drawingSize * 2;
      const ctx = cursorCanvas.getContext('2d')!;

      ctx.beginPath();
      ctx.arc(drawingSize, drawingSize, drawingSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = drawingColor;
      ctx.fill();

      const dataURL = cursorCanvas.toDataURL();
      canvas.style.cursor = `url(${dataURL}) ${drawingSize}, auto`;
    };

    canvas.addEventListener('mousemove', updateCursor);
    return () => canvas.removeEventListener('mousemove', updateCursor);
  }, [isDrawingMode, drawingSize, drawingColor]);

  const fgBaseSize = useMemo(() => {
    const fgScale = Math.min(
      canvasOriginalSize.width / (fgImageSize.width || 1),
      canvasOriginalSize.height / (fgImageSize.height || 1)
    );
    return {
      width: fgImageSize.width * fgScale,
      height: fgImageSize.height * fgScale
    };
  }, [canvasOriginalSize, fgImageSize]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center" ref={containerRef}>
        <canvas
          ref={bgCanvasRef}
          className={cn(
            "max-w-full max-h-full object-contain rounded-xl absolute inset-0 m-auto z-10",
            isDrawingMode && "cursor-crosshair"
          )}
          style={{ pointerEvents: 'auto' }}
          onMouseDown={handleDrawStart}
          onMouseMove={handleDrawMove}
          onMouseUp={handleDrawEnd}
          onMouseLeave={handleDrawEnd}
          onTouchStart={handleDrawStart}
          onTouchMove={handleDrawMove}
          onTouchEnd={handleDrawEnd}
        />
        
        {/* Interactive Text Overlay */}
        <div className="absolute inset-0 m-auto z-20 pointer-events-none" style={{ width: canvasRect?.width, height: canvasRect?.height }}>
          <InteractiveTextOverlay 
            canvasRect={canvasRect} 
            scale={canvasScale}
            fgBaseSize={fgBaseSize}
          />
        </div>

        <canvas
          ref={fgCanvasRef}
          className="max-w-full max-h-full object-contain rounded-xl absolute inset-0 m-auto pointer-events-none z-30"
        />
      </div>
    </div>
  );
}

// Add helper function for transparency visualization
function createCheckerboardPattern() {
  const size = 16;
  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size * 2, size * 2);
  ctx.fillStyle = '#e5e5e5';
  ctx.fillRect(0, 0, size, size);
  ctx.fillRect(size, size, size, size);

  return canvas;
}
