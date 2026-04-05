'use client';

import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  ReactElement,
  ReactNode,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import gsap from 'gsap';

export interface CardSwapProps {
  width?: number | string;
  height?: number | string;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
  onCardClick?: (index: number) => void;
  skewAmount?: number;
  easing?: 'linear' | 'elastic';
  children: ReactNode;
}

export interface SwapCardProps extends React.HTMLAttributes<HTMLDivElement> {
  customClass?: string;
}

const clsx = (...values: Array<string | undefined>) => values.filter(Boolean).join(' ');

export const SwapCard = forwardRef<HTMLDivElement, SwapCardProps>(
  ({ customClass, className, children, ...rest }, ref) => (
    <div
      ref={ref}
      {...rest}
      className={clsx(
        'absolute left-1/2 top-1/2 isolate overflow-hidden rounded-[1.75rem] border border-[color-mix(in_srgb,var(--accent-color)_34%,var(--border-color))]',
        'bg-[linear-gradient(165deg,color-mix(in_srgb,var(--surface-color)_96%,white),color-mix(in_srgb,var(--surface-muted)_58%,var(--surface-color)))]',
        '[backface-visibility:hidden] [transform-style:preserve-3d] [will-change:transform]',
        'shadow-[0_18px_42px_color-mix(in_srgb,var(--accent-color)_18%,transparent)]',
        customClass,
        className,
      )}
    >
      <div className="relative z-[2] h-full">{children}</div>
    </div>
  ),
);

SwapCard.displayName = 'SwapCard';

interface Slot {
  x: number;
  y: number;
  z: number;
  zIndex: number;
}

const makeSlot = (index: number, distX: number, distY: number, total: number): Slot => ({
  x: index * distX,
  y: -index * distY,
  z: -index * distX * 1.5,
  zIndex: total - index,
});

const placeNow = (element: HTMLElement, slot: Slot, skew: number) => {
  gsap.set(element, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    opacity: 1,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: 'center center',
    zIndex: slot.zIndex,
    force3D: true,
  });
};

export function CardSwap({
  width = 500,
  height = 400,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
  onCardClick,
  skewAmount = 6,
  easing = 'elastic',
  children,
}: CardSwapProps) {
  const config = useMemo(
    () =>
      easing === 'elastic'
        ? {
            ease: 'elastic.out(0.6,0.9)',
            durDrop: 2,
            durMove: 2,
            durReturn: 2,
            promoteOverlap: 0.9,
            returnDelay: 0.05,
          }
        : {
            ease: 'power1.inOut',
            durDrop: 0.8,
            durMove: 0.8,
            durReturn: 0.8,
            promoteOverlap: 0.45,
            returnDelay: 0.2,
          },
    [easing],
  );

  const childArray = useMemo(
    () => Children.toArray(children) as ReactElement<SwapCardProps>[],
    [children],
  );

  const orderRef = useRef<number[]>(Array.from({ length: childArray.length }, (_, index) => index));
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const intervalRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const elements = Array.from(
      container.querySelectorAll<HTMLElement>('[data-card-swap-item="true"]'),
    );
    const total = elements.length;

    orderRef.current = Array.from({ length: total }, (_, index) => index);
    elements.forEach((element, index) => {
      gsap.set(element, { opacity: 0 });
      placeNow(element, makeSlot(index, cardDistance, verticalDistance, total), skewAmount);
    });

    const swap = () => {
      if (timelineRef.current?.isActive()) return;
      if (orderRef.current.length < 2) return;

      const [front, ...rest] = orderRef.current;
      const frontElement = elements[front];
      if (!frontElement) return;

      const timeline = gsap.timeline();
      timelineRef.current = timeline;

      timeline.to(frontElement, {
        y: '+=500',
        duration: config.durDrop,
        ease: config.ease,
      });

      timeline.addLabel('promote', `-=${config.durDrop * config.promoteOverlap}`);

      rest.forEach((cardIndex, index) => {
        const element = elements[cardIndex];
        if (!element) return;

        const slot = makeSlot(index, cardDistance, verticalDistance, elements.length);
        timeline.set(element, { zIndex: slot.zIndex }, 'promote');
        timeline.to(
          element,
          {
            x: slot.x,
            y: slot.y,
            z: slot.z,
            duration: config.durMove,
            ease: config.ease,
          },
          `promote+=${index * 0.15}`,
        );
      });

      const backSlot = makeSlot(elements.length - 1, cardDistance, verticalDistance, elements.length);
      timeline.addLabel('return', `promote+=${config.durMove * config.returnDelay}`);
      timeline.call(
        () => {
          gsap.set(frontElement, {
            zIndex: backSlot.zIndex,
            x: backSlot.x,
            y: backSlot.y,
            z: backSlot.z,
          });
        },
        undefined,
        'return',
      );
      timeline.to(
        frontElement,
        {
          x: backSlot.x,
          y: backSlot.y,
          z: backSlot.z,
          duration: config.durReturn,
          ease: config.ease,
        },
        'return',
      );
      timeline.call(() => {
        orderRef.current = [...rest, front];
      });
    };

    intervalRef.current = window.setInterval(swap, delay);

    if (pauseOnHover) {
      const pause = () => {
        timelineRef.current?.pause();
        clearInterval(intervalRef.current);
      };

      const resume = () => {
        timelineRef.current?.play();
        intervalRef.current = window.setInterval(swap, delay);
      };

      container.addEventListener('mouseenter', pause);
      container.addEventListener('mouseleave', resume);

      return () => {
        container.removeEventListener('mouseenter', pause);
        container.removeEventListener('mouseleave', resume);
        clearInterval(intervalRef.current);
      };
    }

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [cardDistance, config, delay, pauseOnHover, skewAmount, verticalDistance]);

  const rendered = childArray.map((child, index) =>
    isValidElement<SwapCardProps>(child)
      ? cloneElement(child, {
          key: index,
          'data-card-swap-item': 'true',
          style: { width, height, ...(child.props.style ?? {}) },
          onClick: (event: React.MouseEvent<HTMLDivElement>) => {
            child.props.onClick?.(event);
            onCardClick?.(index);
          },
        } as SwapCardProps & React.RefAttributes<HTMLDivElement>)
      : child,
  );

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 right-0 origin-bottom-right translate-x-[5%] translate-y-[20%] overflow-visible perspective-[900px] max-[768px]:translate-x-[25%] max-[768px]:translate-y-[25%] max-[768px]:scale-[0.75] max-[480px]:translate-x-[25%] max-[480px]:translate-y-[25%] max-[480px]:scale-[0.55]"
      style={{ width, height }}
    >
      {rendered}
    </div>
  );
}
