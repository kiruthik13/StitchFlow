import React from 'react';
import { BrandHeader, BrandHeaderProps } from '../branding/BrandHeader';

export type DashboardHeaderProps = BrandHeaderProps;

/**
 * Standardized compact industrial dashboard header wrapping BrandHeader
 * with role context, notification unread indicator, profile avatar,
 * and demo-only badge gating.
 */
export function DashboardHeader(props: DashboardHeaderProps) {
  return <BrandHeader {...props} />;
}
