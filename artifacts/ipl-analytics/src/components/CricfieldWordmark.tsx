'use client';

import React from 'react';
import CricFieldLogo from './CricFieldLogo';

export interface CricfieldWordmarkProps {
  primaryColor?: string;
  className?: string;
}

export default function CricfieldWordmark({
  primaryColor,
  className = 'w-full max-w-2xl h-auto',
}: CricfieldWordmarkProps) {
  return <CricFieldLogo accentColor={primaryColor} className={className} />;
}
