import React, { useState, useRef, useEffect } from 'react';
import { useEditor } from '@/hooks/useEditor';
import { Trash2, RotateCw, Axis3d, Move3d } from 'lucide-react';
import { TextSet } from '@/types/editor';

export function InteractiveTextOverlay({ canvasRect, scale = 1, fgBaseSize = { width: 100, height: 100 } }: { canvasRect: DOMRect | null, scale?: number, fgBaseSize?: { width: number, height: number } }) {
  const { 
    textSets, updateTextSet, removeTextSet,
    shapeSets, updateShapeSet, removeShapeSet,
    backgroundImages, updateBackgroundImage, removeBackgroundImage,
    clonedForegrounds, updateClonedForegroundTransform, removeClonedForeground
  } = useEditor();
  
  const [activeTextId, setActiveTextId] = useState<number | null>(null);
  const [hoveredTextId, setHoveredTextId] = useState<number | null>(null);

  const [activeShapeId, setActiveShapeId] = useState<number | null>(null);
  const [hoveredShapeId, setHoveredShapeId] = useState<number | null>(null);

  const [activeBgImageId, setActiveBgImageId] = useState<number | null>(null);
  const [hoveredBgImageId, setHoveredBgImageId] = useState<number | null>(null);

  const [activeCloneId, setActiveCloneId] = useState<number | string | null>(null);
  const [hoveredCloneId, setHoveredCloneId] = useState<number | string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  if (!canvasRect) return null;

  // Generic deselection when clicking outside any interactive element
  const handleContainerClick = (e: React.MouseEvent) => {
    if (e.target === containerRef.current) {
      setActiveTextId(null);
      setActiveShapeId(null);
      setActiveBgImageId(null);
      setActiveCloneId(null);
    }
  };

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleContainerClick}
      className="absolute inset-0 pointer-events-none z-20"
      style={{ overflow: 'hidden' }}
    >
      {backgroundImages.map(bgImage => (
        <InteractiveGenericLayer
          key={`bgimg-${bgImage.id}`}
          item={bgImage}
          type="image"
          isActive={activeBgImageId === bgImage.id}
          isHovered={hoveredBgImageId === bgImage.id}
          onHover={() => setHoveredBgImageId(bgImage.id)}
          onLeave={() => setHoveredBgImageId(null)}
          onSelect={() => {
            setActiveTextId(null); setActiveShapeId(null); setActiveCloneId(null);
            setActiveBgImageId(bgImage.id);
          }}
          onUpdate={(updates: any) => updateBackgroundImage(bgImage.id, updates)}
          onDelete={() => removeBackgroundImage(bgImage.id)}
          containerWidth={canvasRect.width}
          containerHeight={canvasRect.height}
          scale={scale}
          fgBaseSize={fgBaseSize}
        />
      ))}

      {shapeSets.map(shapeSet => (
        <InteractiveGenericLayer
          key={`shape-${shapeSet.id}`}
          item={shapeSet}
          type="shape"
          isActive={activeShapeId === shapeSet.id}
          isHovered={hoveredShapeId === shapeSet.id}
          onHover={() => setHoveredShapeId(shapeSet.id)}
          onLeave={() => setHoveredShapeId(null)}
          onSelect={() => {
            setActiveTextId(null); setActiveBgImageId(null); setActiveCloneId(null);
            setActiveShapeId(shapeSet.id);
          }}
          onUpdate={(updates: any) => updateShapeSet(shapeSet.id, updates)}
          onDelete={() => removeShapeSet(shapeSet.id)}
          containerWidth={canvasRect.width}
          containerHeight={canvasRect.height}
          scale={scale}
          fgBaseSize={fgBaseSize}
        />
      ))}

      {textSets.map(textSet => (
        <InteractiveText 
          key={`text-${textSet.id}`}
          textSet={textSet}
          isActive={activeTextId === textSet.id}
          isHovered={hoveredTextId === textSet.id}
          onHover={() => setHoveredTextId(textSet.id)}
          onLeave={() => setHoveredTextId(null)}
          onSelect={() => {
            setActiveShapeId(null); setActiveBgImageId(null); setActiveCloneId(null);
            setActiveTextId(textSet.id);
          }}
          onUpdate={(updates: any) => updateTextSet(textSet.id, updates)}
          onDelete={() => removeTextSet(textSet.id)}
          containerWidth={canvasRect.width}
          containerHeight={canvasRect.height}
          scale={scale}
          fgBaseSize={fgBaseSize}
        />
      ))}

      {clonedForegrounds.map(clone => (
        <InteractiveGenericLayer
          key={`clone-${clone.id}`}
          item={clone}
          type="clone"
          isActive={activeCloneId === clone.id}
          isHovered={hoveredCloneId === clone.id}
          onHover={() => setHoveredCloneId(clone.id)}
          onLeave={() => setHoveredCloneId(null)}
          onSelect={() => {
            setActiveTextId(null); setActiveShapeId(null); setActiveBgImageId(null);
            setActiveCloneId(clone.id);
          }}
          onUpdate={(updates: any) => updateClonedForegroundTransform(clone.id as number, updates)}
          onDelete={() => removeClonedForeground(clone.id as number)}
          containerWidth={canvasRect.width}
          containerHeight={canvasRect.height}
          scale={scale}
          fgBaseSize={fgBaseSize}
        />
      ))}
    </div>
  );
}

function InteractiveGenericLayer({
  item, type, isActive, isHovered, onHover, onLeave, onSelect, onUpdate, onDelete, containerWidth, containerHeight, scale = 1, fgBaseSize = { width: 100, height: 100 }
}: any) {
  const elementRef = useRef<HTMLDivElement>(null);
  
  // Drag state
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startItemPos = useRef({ h: 0, v: 0 }); // horizontal/vertical or x/y

  // Interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    if (type === 'clone') {
      startItemPos.current = { h: item.position.x, v: item.position.y };
    } else {
      startItemPos.current = { h: item.position.horizontal, v: item.position.vertical };
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      
      const newH = startItemPos.current.h + (dx / containerWidth) * 100;
      const newV = startItemPos.current.v + (dy / containerHeight) * 100;
      
      if (type === 'clone') {
        onUpdate({ position: { x: newH, y: newV } });
      } else {
        onUpdate({ position: { horizontal: newH, vertical: newV } });
      }
    };
    
    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const sizeProp = type === 'clone' ? 'size' : 'scale';
    const startSize = item[sizeProp];
    
    const handleMouseMove = (e: MouseEvent) => {
      const dy = e.clientY - startY;
      // Adjusting size by dragging up/down
      // dy / scale gives unscaled pixel difference. We convert to percentage
      const sizeChange = (dy / scale) * (type === 'clone' ? 0.2 : 0.5); 
      onUpdate({ [sizeProp]: Math.max(1, startSize + sizeChange) });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const startRot = item.rotation || 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      const dy = e.clientY - startY;
      onUpdate({ rotation: startRot + dy });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTiltX = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const startTilt = item.tiltX || 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      const dy = e.clientY - startY;
      onUpdate({ tiltX: startTilt - dy });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTiltY = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startTilt = item.tiltY || 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      onUpdate({ tiltY: startTilt + dx });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  const showControls = isActive || isHovered;

  const tiltX = item.tiltX || 0;
  const tiltY = item.tiltY || 0;
  const rotation = item.rotation || 0;
  const transformStyle = `translate(-50%, -50%) perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) rotate(${rotation}deg)`;

  // Calculate generic bounding box size based on scale/size to make the clickable area proportional
  const baseSize = Math.min(containerWidth / scale, containerHeight / scale);
  let boxWidth = 100 * scale;
  let boxHeight = 100 * scale;
  
  if (type === 'shape') {
    boxWidth = (baseSize * (item.scale / 100)) * scale;
    boxHeight = boxWidth;
  } else if (type === 'image') {
    boxWidth = (baseSize * (item.scale / 100)) * scale;
    boxHeight = boxWidth;
  } else if (type === 'clone') {
    boxWidth = fgBaseSize.width * (item.size / 100) * scale;
    boxHeight = fgBaseSize.height * (item.size / 100) * scale;
  }

  const posX = type === 'clone' ? 50 + item.position.x : item.position.horizontal;
  const posY = type === 'clone' ? 50 + item.position.y : item.position.vertical;

  return (
    <div
      ref={elementRef}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onMouseDown={handleMouseDown}
      className={`absolute cursor-move flex items-center justify-center pointer-events-auto ${showControls ? 'border-[2px] border-dashed border-[#10B981]' : 'border-[2px] border-transparent'}`}
      style={{
        left: `${posX}%`,
        top: `${posY}%`,
        width: `${boxWidth}px`,
        height: `${boxHeight}px`,
        transform: transformStyle,
        transformOrigin: 'center center',
      }}
    >
      {showControls && (
        <>
          {/* Resize handle (bottom-right) */}
          <div 
            onMouseDown={handleResize}
            className="absolute -right-3 -bottom-3 w-6 h-6 bg-[#10B981] rounded-full cursor-nwse-resize shadow-md border-2 border-white z-20"
            title="Resize"
          />
          
          {/* Delete button (top-right) */}
          <div 
            onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute -right-4 -top-4 w-8 h-8 bg-red-500 rounded-full cursor-pointer shadow-md border-2 border-white flex items-center justify-center text-white hover:bg-red-600 z-20"
            title="Delete"
          >
            <Trash2 size={16} />
          </div>

          {/* Rotate handle (right-middle) */}
          <div 
            onMouseDown={handleRotate}
            className="absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full cursor-ns-resize shadow-md border-2 border-white flex items-center justify-center text-white hover:bg-blue-600 z-20"
            title="Rotate 2D"
          >
            <RotateCw size={12} />
          </div>

          {/* Tilt X handle (left-middle) */}
          <div 
            onMouseDown={handleTiltX}
            className="absolute -left-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-purple-500 rounded-full cursor-ns-resize shadow-md border-2 border-white flex items-center justify-center text-white hover:bg-purple-600 z-20"
            title="Tilt X (3D)"
          >
            <Axis3d size={12} />
          </div>
          <div 
            onMouseDown={handleTiltY}
            className="absolute left-1/2 -top-4 -translate-x-1/2 w-6 h-6 bg-orange-500 rounded-full cursor-ew-resize shadow-md border-2 border-white flex items-center justify-center text-white hover:bg-orange-600 z-20"
            title="Tilt Y (3D)"
          >
            <Move3d size={12} />
          </div>
        </>
      )}
    </div>
  );
}

function InteractiveText({ 
  textSet, isActive, isHovered, onHover, onLeave, onSelect, onUpdate, onDelete, containerWidth, containerHeight, scale = 1
}: any) {
  const elementRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const initialText = useRef(textSet.text);
  
  // Drag state
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const startTextPos = useRef({ h: 0, v: 0 });

  // Interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isEditing) return;
    e.stopPropagation();
    onSelect();
    isDragging.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
    startTextPos.current = { h: textSet.position.horizontal, v: textSet.position.vertical };
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - startPos.current.x;
      const dy = e.clientY - startPos.current.y;
      
      const newH = startTextPos.current.h + (dx / containerWidth) * 100;
      const newV = startTextPos.current.v + (dy / containerHeight) * 100;
      
      onUpdate({ position: { horizontal: newH, vertical: newV } });
    };
    
    const handleMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResize = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const startSize = textSet.fontSize;
    
    const handleMouseMove = (e: MouseEvent) => {
      const dy = e.clientY - startY;
      onUpdate({ fontSize: Math.max(10, startSize + dy / scale) });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleRotate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const startRot = textSet.rotation;
    
    const handleMouseMove = (e: MouseEvent) => {
      const dy = e.clientY - startY;
      onUpdate({ rotation: startRot + dy });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTiltX = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startY = e.clientY;
    const startTilt = textSet.tiltX || 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      const dy = e.clientY - startY;
      onUpdate({ tiltX: startTilt - dy });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTiltY = (e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startTilt = textSet.tiltY || 0;
    
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - startX;
      onUpdate({ tiltY: startTilt + dx });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    initialText.current = textSet.text;
    setIsEditing(true);
    setTimeout(() => {
      if (textRef.current) {
        textRef.current.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 0);
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (textRef.current) {
      // Use innerText but replace newlines to keep it single line, or just innerText
      const newText = textRef.current.innerText.replace(/\n/g, '').trim();
      if (newText !== textSet.text) {
        onUpdate({ text: newText || 'new text' });
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      textRef.current?.blur();
    }
  };

  const showControls = isActive || isHovered;

  // The CSS Transform fix: translate(-50%, -50%) must be combined with perspective, rotateX, rotateY, and rotate(Z).
  // The correct order to apply rotations so that tiltX and tiltY behave like 3D tilt on the text plane is:
  // perspective -> translate -> rotateX -> rotateY -> rotateZ
  const transformStyle = `translate(-50%, -50%) perspective(1000px) rotateX(${textSet.tiltX || 0}deg) rotateY(${textSet.tiltY || 0}deg) rotate(${textSet.rotation || 0}deg)`;

  // const scale = containerWidth && containerHeight ? containerWidth / (containerWidth / (canvasRect?.width || containerWidth)) : 1; // Actually containerWidth is canvasRect.width
  // Wait, containerWidth IS canvasRect.width. We need the original image width!
  // Let's pass scale directly from parent.

  return (
    <div
      ref={elementRef}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className={`absolute flex items-center justify-center pointer-events-auto ${showControls ? 'border-[2px] border-dashed border-[#10B981]' : 'border-[2px] border-transparent'}`}
      style={{
        left: `${textSet.position.horizontal}%`,
        top: `${textSet.position.vertical}%`,
        transform: transformStyle,
        transformOrigin: 'center center',
        color: textSet.color,
        opacity: textSet.opacity,
        fontFamily: textSet.fontFamily,
        fontWeight: textSet.fontWeight,
        fontSize: `${textSet.fontSize * scale}px`,
        textShadow: textSet.glow?.enabled ? `0 0 ${textSet.glow.intensity}px ${textSet.glow.color}` : 'none',
        whiteSpace: 'nowrap',
        userSelect: isEditing ? 'text' : 'none',
      }}
    >
      {isEditing ? (
        <span
          ref={textRef}
          contentEditable
          suppressContentEditableWarning
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onInput={(e) => {
            // Prevent React from doing any re-rendering by managing innerHTML purely in the DOM
            e.stopPropagation();
          }}
          className="outline-none whitespace-pre"
          style={{ cursor: 'text' }}
          dangerouslySetInnerHTML={{
            __html: initialText.current
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
          }}
        />
      ) : (
        <span style={{ cursor: 'move' }}>{textSet.text}</span>
      )}

      {showControls && !isEditing && (
        <>
          {/* Resize handle (bottom-right) */}
          <div 
            onMouseDown={handleResize}
            className="absolute -right-3 -bottom-3 w-6 h-6 bg-[#10B981] rounded-full cursor-nwse-resize shadow-md border-2 border-white z-20"
            title="Resize"
          />
          
          {/* Delete button (top-right) */}
          <div 
            onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
            className="absolute -right-4 -top-4 w-8 h-8 bg-red-500 rounded-full cursor-pointer shadow-md border-2 border-white flex items-center justify-center text-white hover:bg-red-600 z-20"
            title="Delete"
          >
            <Trash2 size={16} />
          </div>

          {/* Rotate handle (right-middle) */}
          <div 
            onMouseDown={handleRotate}
            className="absolute -right-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-blue-500 rounded-full cursor-ns-resize shadow-md border-2 border-white flex items-center justify-center text-white hover:bg-blue-600 z-20"
            title="Rotate 2D"
          >
            <RotateCw size={12} />
          </div>

          {/* Tilt X handle (left-middle) */}
          <div 
            onMouseDown={handleTiltX}
            className="absolute -left-4 top-1/2 -translate-y-1/2 w-6 h-6 bg-purple-500 rounded-full cursor-ns-resize shadow-md border-2 border-white flex items-center justify-center text-white hover:bg-purple-600 z-20"
            title="Tilt X (3D)"
          >
            <Axis3d size={12} />
          </div>

          {/* Tilt Y handle (top-middle) */}
          <div 
            onMouseDown={handleTiltY}
            className="absolute left-1/2 -top-4 -translate-x-1/2 w-6 h-6 bg-orange-500 rounded-full cursor-ew-resize shadow-md border-2 border-white flex items-center justify-center text-white hover:bg-orange-600 z-20"
            title="Tilt Y (3D)"
          >
            <Move3d size={12} />
          </div>
        </>
      )}
    </div>
  );
}