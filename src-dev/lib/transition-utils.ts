
"use client";

import { useEffect } from 'react';
import { useMotionValue, useSpring, type Variants } from 'framer-motion';

// Custom easing functions
export const easingFunctions = {
  easeOutQuart: [0.165, 0.84, 0.44, 1],
  easeOutExpo: [0.19, 1, 0.22, 1],
  easeInOutBack: [0.68, -0.55, 0.265, 1.55],
  easeSpring: [0.175, 0.885, 0.32, 1.275],
  easeOutCirc: [0.075, 0.82, 0.165, 1],
  easeInOutQuint: [0.83, 0, 0.17, 1],
} as const;

// Advanced transition presets
export const transitionPresets = {
  smooth: {
    duration: 0.6,
    ease: easingFunctions.easeOutExpo,
  },
  spring: {
    type: "spring" as const,
    damping: 25,
    stiffness: 300,
  },
  snappy: {
    duration: 0.3,
    ease: easingFunctions.easeOutQuart,
  },
  dramatic: {
    duration: 0.8,
    ease: easingFunctions.easeInOutBack,
  },
  gentle: {
    duration: 1.2,
    ease: easingFunctions.easeOutCirc,
  },
};

// Page transition variants with advanced effects
export const pageTransitions = {
  slidePerspective: {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.98,
      filter: 'blur(4px)',
      rotateX: -10,
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: 'blur(0px)',
      rotateX: 0,
      transition: {
        ...transitionPresets.smooth,
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.98,
      filter: 'blur(4px)',
      rotateX: 10,
      transition: { ...transitionPresets.snappy },
    },
  },
  clipReveal: {
    hidden: {
      clipPath: 'polygon(0 0, 0 0, 0 100%, 0% 100%)',
      filter: 'brightness(0.3)',
    },
    visible: {
      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0% 100%)',
      filter: 'brightness(1)',
      transition: {
        clipPath: { duration: 0.8, ease: easingFunctions.easeOutExpo },
        filter: { duration: 0.6, delay: 0.2 },
      },
    },
    exit: {
      clipPath: 'polygon(100% 0, 100% 0, 100% 100%, 100% 100%)',
      filter: 'brightness(0.3)',
      transition: {
        clipPath: { duration: 0.6, ease: easingFunctions.easeInOutQuint },
      },
    },
  },
};

// Container variants for staggered animations
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.15,
      when: "beforeChildren",
    },
  },
  exit: {
    opacity: 0,
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1,
      when: "afterChildren",
    },
  },
};

// Item variants for individual elements
export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.98,
    filter: 'blur(3px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: transitionPresets.spring,
  },
  exit: {
    opacity: 0,
    y: -15,
    scale: 0.98,
    filter: 'blur(3px)',
    transition: transitionPresets.snappy,
  },
};

// Custom hook for mouse tracking
export const useMousePosition = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    
    window.addEventListener('mousemove', updateMousePosition);
    
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    };
  }, [mouseX, mouseY]);
  
  return { mouseX, mouseY };
};
