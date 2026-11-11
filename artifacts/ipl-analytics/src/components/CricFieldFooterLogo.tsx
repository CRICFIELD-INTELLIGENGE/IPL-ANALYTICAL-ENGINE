'use client';

import React from 'react';
import CricFieldLogo, { CricFieldLogoProps } from './CricFieldLogo';

export default function CricFieldFooterLogo(props: CricFieldLogoProps) {
  return <CricFieldLogo variant="footer" {...props} />;
}
