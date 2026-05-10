import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { DashboardCard } from '@/components/dashboard/DashboardCard';

interface DashboardBlockComponentProps {
  node: {
  attrs: {
  collectionName: string;
  filter: string;
  title: string;
  };
  };
}

export const DashboardBlockComponent: React.FC<DashboardBlockComponentProps> = ({ node }) => {
  const { collectionName, filter, title } = node.attrs;

  return (
  <NodeViewWrapper className="dashboard-block-wrapper">
  <DashboardCard
    collectionName={collectionName}
    filter={filter}
    title={title}
  />
  </NodeViewWrapper>
  );
};
