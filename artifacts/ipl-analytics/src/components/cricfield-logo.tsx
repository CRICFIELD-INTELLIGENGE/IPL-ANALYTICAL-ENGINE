import React from 'react';
import CricFieldLogo, { CricFieldLogoProps } from '@/components/CricFieldLogo';

export interface CricfieldLogoProps extends CricFieldLogoProps {}

export function CricfieldLogo(props: CricfieldLogoProps) {
  return <CricFieldLogo {...props} />;
}

export default CricfieldLogo;
