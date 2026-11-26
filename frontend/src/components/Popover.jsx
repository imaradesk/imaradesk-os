import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { isInFloatingLayer } from '../utils/floatingLayer';

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
  onBeforeClose,
  openOnHover = false,
  hoverDelay = 200,
  strategy = "absolute", // "absolute" | "fixed" (fixed escapes overflow-clipping parents)
}) {
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState("bottom");
  const [hAlign, setHAlign] = useState("center");
  const [vAlign, setVAlign] = useState("center"); // for horizontal placement
  const [fixedPos, setFixedPos] = useState({ top: 0, left: 0, arrowTop: 16 });
  const wrapRef = useRef(null);
  const hoverTimer = useRef(null);
  const onBeforeCloseRef = useRef(onBeforeClose);
  onBeforeCloseRef.current = onBeforeClose;

  const recalc = useCallback(() => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    if (placement === "right" && strategy === "fixed") {
      const h = Math.min(maxHeight, vh - EDGE_MARGIN * 2);
      const midY = r.top + r.height / 2;
      const top = Math.max(EDGE_MARGIN, Math.min(r.top - 16, vh - h - EDGE_MARGIN));
      setFixedPos({ top, left: r.right + GAP, arrowTop: Math.max(8, midY - top - 9) });
      return;
    }

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

    let nextSide;
    if (fits(spaceBelow)) nextSide = "bottom";
    else if (fits(spaceAbove)) nextSide = "top";
    else nextSide = spaceBelow >= spaceAbove ? "bottom" : "top";
    setSide(nextSide);

    const triggerMidX = r.left + r.width / 2;
    const halfW = width / 2;
    let nextHAlign;
    if (triggerMidX - halfW < EDGE_MARGIN) nextHAlign = "left";
    else if (triggerMidX + halfW > vw - EDGE_MARGIN) nextHAlign = "right";
    else nextHAlign = "center";
    setHAlign(nextHAlign);

    if (strategy === "fixed") {
      // Viewport coordinates so scrolling/clipping ancestors can't cut the panel off
      const preferred = nextHAlign === "left" ? r.left : nextHAlign === "right" ? r.right - width : triggerMidX - halfW;
      const left = Math.max(EDGE_MARGIN, Math.min(preferred, vw - width - EDGE_MARGIN));
      setFixedPos({
        left,
        top: nextSide === "bottom" ? r.bottom + GAP : undefined,
        bottom: nextSide === "top" ? vh - r.top + GAP : undefined,
        arrowLeft: Math.max(12, Math.min(triggerMidX - left - 9, width - 30)),
      });
    }
  }, [width, maxHeight, placement, strategy]);

  // The panel stays mounted while closed (hidden), so align it on mount and resize
  // too — a stale "center" alignment near the viewport edge makes the page scroll sideways.
  useLayoutEffect(() => {
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [recalc]);

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
    // Only listen while open: a closed popover must not treat every click on the
    // page as "clicked outside" and fire onBeforeClose (which, via the unsaved
    // changes guard, used to pop the discard dialog while another form was dirty).
    if (!open) return undefined;
    const handler = (e) => {
      if (isInFloatingLayer(e.target)) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        if (onBeforeCloseRef.current) onBeforeCloseRef.current(() => setOpen(false));
        else setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

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

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const hoverProps = openOnHover
    ? {
        onMouseEnter: () => {
          clearTimeout(hoverTimer.current);
          hoverTimer.current = setTimeout(() => {
            recalc();
            setOpen(true);
            onOpenChange?.(true);
          }, hoverDelay);
        },
        onMouseLeave: () => {
          clearTimeout(hoverTimer.current);
          if (open) close();
        },
      }
    : {};

  // Positioning for horizontal (right) placement
  if (placement === "right") {
    const isFixed = strategy === "fixed";
    const rightStyle = isFixed
      ? { left: fixedPos.left, top: fixedPos.top }
      : { left: `calc(100% + ${GAP}px)` };
    const vAlignStyle = isFixed ? {} : {
      top: { top: 0 },
      center: { top: "50%", marginTop: -(Math.min(maxHeight, 400) / 2) },
      bottom: { bottom: 0 },
    }[vAlign];
    
    const slideX = -6;
    
    // Arrow for right placement
    const arrowVert = isFixed
      ? { top: fixedPos.arrowTop, transform: "none" }
      : vAlign === "bottom"
      ? { bottom: 16, top: "auto", transform: "none" }
      : vAlign === "top"
        ? { top: 16, transform: "none" }
        : { top: "50%", transform: "translateY(-50%)" };
    
    return (
      <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }} className={className} {...hoverProps}>
        {trigger({ open, toggle, close })}

        <div style={{
          position: isFixed ? "fixed" : "absolute",
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
          <div className="popover-panel" style={{
            background: "var(--popover-bg, #fff)",
            border: "1px solid var(--popover-border, #e5e7eb)",
            borderRadius: 12,
            boxShadow: "var(--popover-shadow, 0 4px 6px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.14))",
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
                borderRight: "9px solid var(--popover-border, #e5e7eb)",
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
                borderRight: "8px solid var(--popover-bg, #fff)",
                ...arrowVert,
              }} />
            </>
          )}
        </div>
      </div>
    );
  }

  // Default vertical (top/bottom) placement
  const isFixedVert = strategy === "fixed";
  const vertStyle = isFixedVert
    ? (side === "top" ? { bottom: fixedPos.bottom } : { top: fixedPos.top })
    : side === "top"
      ? { bottom: `calc(100% + ${GAP}px)` }
      : { top: `calc(100% + ${GAP}px)` };

  const horizStyle = isFixedVert ? { left: fixedPos.left } : {
    left: { left: 0 },
    center: { left: "50%", marginLeft: -(width / 2) },
    right: { right: 0 },
  }[hAlign];

  const slideY = side === "top" ? 6 : -6;

  // Arrow positioning - attached to body
  const arrowHoriz = isFixedVert
    ? { left: fixedPos.arrowLeft, transform: "none" }
    : hAlign === "right"
    ? { right: 16, left: "auto", transform: "none" }
    : hAlign === "left"
      ? { left: 16, transform: "none" }
      : { left: "50%", transform: "translateX(-50%)" };

  return (
    <div ref={wrapRef} style={{ position: "relative", display: "inline-block" }} className={className} {...hoverProps}>
      {trigger({ open, toggle, close })}

      <div style={{
        position: isFixedVert ? "fixed" : "absolute",
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
        <div className="popover-panel" style={{
          background: "var(--popover-bg, #fff)",
          border: "1px solid var(--popover-border, #e5e7eb)",
          borderRadius: 12,
          boxShadow: "var(--popover-shadow, 0 4px 6px rgba(0,0,0,0.04), 0 16px 48px rgba(0,0,0,0.14))",
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
                ? { bottom: -9, borderTop: "9px solid var(--popover-border, #e5e7eb)" }
                : { top: -9, borderBottom: "9px solid var(--popover-border, #e5e7eb)" }
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
                ? { bottom: -7, borderTop: "8px solid var(--popover-bg, #fff)" }
                : { top: -7, borderBottom: "8px solid var(--popover-bg, #fff)" }
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
