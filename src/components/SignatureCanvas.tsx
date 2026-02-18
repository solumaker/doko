import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

export interface SignatureCanvasRef {
  getDataUrl: () => string;
  clear: () => void;
  hasContent: () => boolean;
}

interface SignatureCanvasProps {
  width?: number;
  height?: number;
  onChange?: (hasContent: boolean) => void;
}

export const SignatureCanvas = forwardRef<SignatureCanvasRef, SignatureCanvasProps>(
  ({ width = 320, height = 160, onChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawn, setDrawn] = useState(false);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      if ('touches' in e) {
        const touch = e.touches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      e.preventDefault();
      setIsDrawing(true);
      lastPos.current = getPos(e, canvas);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      e.preventDefault();
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const pos = getPos(e, canvas);
      if (lastPos.current) {
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
      lastPos.current = pos;
      if (!drawn) {
        setDrawn(true);
        onChange?.(true);
      }
    };

    const stopDraw = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDrawing(false);
      lastPos.current = null;
    };

    const clear = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setDrawn(false);
      onChange?.(false);
    };

    useImperativeHandle(ref, () => ({
      getDataUrl: () => canvasRef.current?.toDataURL('image/png') || '',
      clear,
      hasContent: () => drawn,
    }));

    return (
      <div className="space-y-2">
        <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white touch-none">
          <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className="w-full cursor-crosshair block"
            style={{ touchAction: 'none' }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
          />
        </div>
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 transition-colors px-2 py-1"
        >
          <Trash2 size={14} />
          Borrar firma
        </button>
      </div>
    );
  }
);

SignatureCanvas.displayName = 'SignatureCanvas';
