import type { ReactNode } from 'react';
import { Chip } from '@heroui/react';

export const StatusChip = ({ tone, children }: { tone: 'success' | 'warning' | 'default'; children: ReactNode }) => (
  <Chip color={tone} size="sm"><Chip.Label>{children}</Chip.Label></Chip>
);
