import React, { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────
//  CORE POPOVER — smart auto-placement
//  Measures available space above/below/left/right
//  on every open and on scroll/resize, then picks
//  the best position automatically.
//  Supports `placement` prop: "auto", "right" for sidebar use
// ─────────────────────────────────────────────
const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 360;
const GAP = 8;
const EDGE_MARGIN = 8;

export function Popover({ 
  trigger, 
  children, 
  width = DEFAULT_WIDTH,
  maxHeight = DEFAULT_HEIGHT,
  className = "",
  showArrow = true,
  placement = "auto", // "auto" | "right"
  onOpenChange,
}) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState("bottom");
  const [hAlign, setHAlign] = useState("center");
  const [vAlign, setVAlign] = useState("center"); // for horizontal placement
  const wrapRef = useRef(null);

  const recalc = useCallback(() => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    if (placement === "right") {
      // For right placement, calculate vertical alignment
      const triggerMidY = r.top + r.height / 2;
      const halfH = Math.min(maxHeight, 400) / 2;
      if (triggerMidY - halfH < EDGE_MARGIN) setVAlign("top");
      else if (triggerMidY + halfH > vh - EDGE_MARGIN) setVAlign("bottom");
      else setVAlign("center");
      return;
    }

    const spaceAbove = r.top - EDGE_MARGIN;
    const spaceBelow = vh - r.bottom - EDGE_MARGIN;
    const fits = (space) => space >= maxHeight + GAP;

    if (fits(spaceBelow)) setSide("bottom");
    else if (fits(spaceAbove)) setSide("top");
    else setSide(spaceBelow >= spaceAbove ? "bottom" : "top");

    const triggerMidX = r.left + r.width / 2;
    const halfW = width / 2;
    if (triggerMidX - halfW < EDGE_MARGIN) setHAlign("left");
    else if (triggerMidX + halfW > vw - EDGE_MARGIN) setHAlign("right");
    else setHAlign("center");
  }, [width, maxHeight, placement]);

  useEffect(() => {
    if (!open) return;
    recalc();
    window.addEventListener("resize", recalc);
    window.addEventListener("scroll", recalc, true);
    return () => {
      window.removeEventListener("resize", recalc);
      window.removeEventListener("scroll", recalc, true);
    };
  }, [open, recalc]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const close = () => {
    setOpen(false);
    onOpenChange?.(false);
  };
  const toggle = () => {
    setOpen((v) => {
      const newVal = !v;
      onOpenChange?.(newVal);
      return newVal;
    });
  };

  // Positioning for horizontal (right) placement
  if (placement === "right") {
    const rightStyle = { left: `calc(100% + ${GAP}px)` };
    const vAlignStyle = {
      top: { top: 0 },
      center: { top: "50%", marginTop: -(Math.min(maxHeight, 400) / 2) },
      bottom: { bottom: 0 },
    }[vAlign];
    
    const slideX = -6;
    
    // Arrow for right placement
    const arrowVert = vAlign === "bottom"
      ? { bottom: 16, top: "auto", transform: "none" }
      : vAlign === "top"
        ? { top: 16, transform: "none" }
        : { top: "50%", transform: "translateY(-50%)" };
    
    return (
      <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }} className={className}>
        {trigger({ open, toggle, close })}

        <div style={{
          position: "absolute",
          width: width,
          maxHeight: maxHeight,
          zIndex: 9999,
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transform: `translateX(${open ? 0 : slideX}px)`,
          transition: "opacity 0.18s ease, transform 0.18s ease, visibility 0.18s",
          pointerEvents: open ? "all" : "none",
          ...rightStyle,
          ...vAlignStyle,
        }}>
          <div style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 12,
            boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.14)",
            overflow: "hidden",
            maxHeight: maxHeight,
            overflowY: "auto",
          }}>
            {typeof children === "function" ? children({ close, open }) : children}
          </div>

          {showArrow && (
            <>
              {/* Border arrow (outer) - pointing left */}
              <div style={{
                position: "absolute",
                width: 0,
                height: 0,
                pointerEvents: "none",
                borderTop: "9px solid transparent",
                borderBottom: "9px solid transparent",
                left: -9,
                borderRight: "9px solid #e5e7eb",
                ...arrowVert,
              }} />
              {/* Fill arrow (inner) */}
              <div style={{
                position: "absolute",
                width: 0,
                height: 0,
                pointerEvents: "none",
                borderTop: "8px solid transparent",
                borderBottom: "8px solid transparent",
                left: -7,
                borderRight: "8px solid #fff",
                ...arrowVert,
              }} />
            </>
          )}
        </div>
      </div>
    );
  }

  // Default vertical (top/bottom) placement
  const vertStyle = side === "top"
    ? { bottom: `calc(100% + ${GAP}px)` }
    : { top: `calc(100% + ${GAP}px)` };

  const horizStyle = {
    left: { left: 0 },
    center: { left: "50%", marginLeft: -(width / 2) },
    right: { right: 0 },
  }[hAlign];

  const slideY = side === "top" ? 6 : -6;

  // Arrow positioning - attached to body
  const arrowHoriz = hAlign === "right"
    ? { right: 16, left: "auto", transform: "none" }
    : hAlign === "left"
      ? { left: 16, transform: "none" }
      : { left: "50%", transform: "translateX(-50%)" };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }} className={className}>
      {trigger({ open, toggle, close })}

      <div style={{
        position: "absolute",
        width: width,
        zIndex: 9999,
        opacity: open ? 1 : 0,
        visibility: open ? "visible" : "hidden",
        transform: `translateY(${open ? 0 : slideY}px)`,
        transition: "opacity 0.18s ease, transform 0.18s ease, visibility 0.18s",
        pointerEvents: open ? "all" : "none",
        ...vertStyle,
        ...horizStyle,
      }}>
        <div style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 4px 6px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.14)",
          overflow: "hidden",
        }}>
          {typeof children === "function" ? children({ close, open }) : children}
        </div>

        {showArrow && (
          <>
            {/* Border arrow (outer) */}
            <div style={{
              position: "absolute",
              width: 0,
              height: 0,
              pointerEvents: "none",
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              ...(side === "top" 
                ? { bottom: -9, borderTop: "9px solid #e5e7eb" }
                : { top: -9, borderBottom: "9px solid #e5e7eb" }
              ),
              ...arrowHoriz,
            }} />
            {/* Fill arrow (inner) - covers border to create fill */}
            <div style={{
              position: "absolute",
              width: 0,
              height: 0,
              pointerEvents: "none",
              borderLeft: "8px solid transparent",
              borderRight: "8px solid transparent",
              ...(side === "top" 
                ? { bottom: -7, borderTop: "8px solid #fff" }
                : { top: -7, borderBottom: "8px solid #fff" }
              ),
              ...arrowHoriz,
            }} />
          </>
        )}
      </div>
    </div>
  );
}

export default Popover;
