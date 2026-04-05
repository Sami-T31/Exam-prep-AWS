'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import clsx from 'clsx';
import { gsap } from 'gsap';

export interface PillNavItem {
  key?: string;
  label: string;
  href?: string;
  onClick?: () => void;
  ariaLabel?: string;
  matchPrefixes?: string[];
  active?: boolean;
  disabled?: boolean;
}

interface PillNavProps {
  items: PillNavItem[];
  className?: string;
  size?: 'sm' | 'md';
}

function matchesPath(pathname: string, item: PillNavItem) {
  if (!item.href) return false;

  const prefixes = item.matchPrefixes?.length
    ? item.matchPrefixes
    : [item.href];

  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const sizeStyles = {
  sm: {
    container: 'gap-1 rounded-[1.55rem] p-1',
    pill: 'min-h-[2.5rem] px-4 py-1 text-sm',
  },
  md: {
    container: 'gap-1 rounded-[1.8rem] p-1.5',
    pill: 'min-h-[2.75rem] px-5 py-1 text-sm',
  },
} as const;

export function PillNav({ items, className, size = 'md' }: PillNavProps) {
  const pathname = usePathname();
  const pillRefs = useRef<Array<HTMLElement | null>>([]);
  const circleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const labelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const hoverLabelRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const timelinesRef = useRef<Array<gsap.core.Timeline | null>>([]);
  const activeTweensRef = useRef<Array<gsap.core.Tween | null>>([]);

  const resolvedItems = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        resolvedActive:
          typeof item.active === 'boolean'
            ? item.active
            : matchesPath(pathname, item),
      })),
    [items, pathname],
  );

  useEffect(() => {
    const layout = () => {
      resolvedItems.forEach((item, index) => {
        const pill = pillRefs.current[index];
        const circle = circleRefs.current[index];
        const label = labelRefs.current[index];
        const hoverLabel = hoverLabelRefs.current[index];

        if (!pill || !circle) return;

        const rect = pill.getBoundingClientRect();
        const { width, height } = rect;
        const radius = ((width * width) / 4 + height * height) / (2 * height);
        const diameter = Math.ceil(2 * radius) + 2;
        const delta =
          Math.ceil(
            radius -
              Math.sqrt(Math.max(0, radius * radius - (width * width) / 4)),
          ) + 1;
        const originY = diameter - delta;

        circle.style.width = `${diameter}px`;
        circle.style.height = `${diameter}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: item.resolvedActive ? 1.08 : 0,
          transformOrigin: `50% ${originY}px`,
        });

        if (label) {
          gsap.set(label, { y: item.resolvedActive ? -(height + 8) : 0 });
        }

        if (hoverLabel) {
          gsap.set(hoverLabel, {
            y: item.resolvedActive ? 0 : height + 12,
            opacity: item.resolvedActive ? 1 : 0,
          });
        }

        timelinesRef.current[index]?.kill();
        const timeline = gsap.timeline({ paused: true });

        timeline.to(
          circle,
          {
            scale: 1.08,
            xPercent: -50,
            duration: 0.7,
            ease: 'power3.out',
            overwrite: 'auto',
          },
          0,
        );

        if (label) {
          timeline.to(
            label,
            {
              y: -(height + 8),
              duration: 0.7,
              ease: 'power3.out',
              overwrite: 'auto',
            },
            0,
          );
        }

        if (hoverLabel) {
          timeline.to(
            hoverLabel,
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              ease: 'power3.out',
              overwrite: 'auto',
            },
            0,
          );
        }

        timeline.progress(item.resolvedActive ? 1 : 0);
        timelinesRef.current[index] = timeline;
      });
    };

    layout();
    window.addEventListener('resize', layout);
    if (document.fonts) {
      document.fonts.ready.then(layout).catch(() => {});
    }

    return () => window.removeEventListener('resize', layout);
  }, [resolvedItems]);

  useEffect(() => {
    resolvedItems.forEach((item, index) => {
      const timeline = timelinesRef.current[index];
      if (!timeline) return;

      activeTweensRef.current[index]?.kill();
      activeTweensRef.current[index] = timeline.tweenTo(
        item.resolvedActive ? timeline.duration() : 0,
        {
          duration: item.resolvedActive ? 0.28 : 0.22,
          ease: 'power3.out',
          overwrite: 'auto',
        },
      );
    });
  }, [resolvedItems]);

  const handleEnter = (index: number) => {
    const timeline = timelinesRef.current[index];
    if (!timeline) return;

    activeTweensRef.current[index]?.kill();
    activeTweensRef.current[index] = timeline.tweenTo(timeline.duration(), {
      duration: 0.28,
      ease: 'power3.out',
      overwrite: 'auto',
    });
  };

  const handleLeave = (index: number) => {
    const timeline = timelinesRef.current[index];
    const item = resolvedItems[index];
    if (!timeline || !item) return;

    activeTweensRef.current[index]?.kill();
    activeTweensRef.current[index] = timeline.tweenTo(
      item.resolvedActive ? timeline.duration() : 0,
      {
        duration: 0.22,
        ease: 'power3.out',
        overwrite: 'auto',
      },
    );
  };

  return (
    <div
      className={clsx(
        'inline-flex max-w-full flex-wrap items-center border border-[color-mix(in_srgb,var(--accent-color)_20%,var(--border-color))] bg-[linear-gradient(165deg,color-mix(in_srgb,var(--surface-color)_96%,white),color-mix(in_srgb,var(--surface-muted)_64%,var(--surface-color)))] shadow-[0_14px_30px_color-mix(in_srgb,var(--accent-color)_14%,transparent)]',
        sizeStyles[size].container,
        className,
      )}
      aria-label="Pill navigation"
    >
      {resolvedItems.map((item, index) => {
        const itemKey = item.key ?? item.href ?? item.label;
        const commonClassName = clsx(
          'group relative inline-flex items-center justify-center overflow-hidden rounded-full border border-[color-mix(in_srgb,var(--accent-color)_18%,var(--border-color))] bg-[color-mix(in_srgb,var(--surface-color)_94%,white)] text-[var(--accent-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55',
          sizeStyles[size].pill,
        );

        const content = (
          <>
            <span
              ref={(element) => {
                circleRefs.current[index] = element;
              }}
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 z-[1] rounded-full bg-[linear-gradient(135deg,var(--accent-color),color-mix(in_srgb,var(--accent-color)_76%,var(--accent-strong)))] shadow-[0_16px_28px_color-mix(in_srgb,var(--accent-color)_26%,transparent)]"
            />
            <span className="relative z-[2] inline-flex items-center justify-center overflow-hidden leading-[1.2]">
              <span
                ref={(element) => {
                  labelRefs.current[index] = element;
                }}
                className="relative inline-block whitespace-nowrap"
              >
                {item.label}
              </span>
              <span
                ref={(element) => {
                  hoverLabelRefs.current[index] = element;
                }}
                aria-hidden="true"
                className="absolute left-0 top-0 inline-block whitespace-nowrap text-white"
              >
                {item.label}
              </span>
            </span>
          </>
        );

        if (item.href) {
          return (
            <Link
              key={itemKey}
              href={item.href}
              aria-label={item.ariaLabel ?? item.label}
              ref={(element) => {
                pillRefs.current[index] = element;
              }}
              onMouseEnter={() => handleEnter(index)}
              onMouseLeave={() => handleLeave(index)}
              onFocus={() => handleEnter(index)}
              onBlur={() => handleLeave(index)}
              className={commonClassName}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={itemKey}
            type="button"
            aria-label={item.ariaLabel ?? item.label}
            ref={(element) => {
              pillRefs.current[index] = element;
            }}
            onClick={item.onClick}
            onMouseEnter={() => handleEnter(index)}
            onMouseLeave={() => handleLeave(index)}
            onFocus={() => handleEnter(index)}
            onBlur={() => handleLeave(index)}
            disabled={item.disabled}
            className={commonClassName}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
