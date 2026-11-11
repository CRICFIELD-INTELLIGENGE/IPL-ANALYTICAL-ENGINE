'use client';

import React from 'react';
import CricFieldLogo, { CricFieldLogoProps } from './CricFieldLogo';

export default function CricFieldNavLogo(props: CricFieldLogoProps) {
  return <CricFieldLogo variant="header" {...props} />;
}
