import React from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { DashboardCard } from '@/components/Dashboard/DashboardCard';

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
  <NodeViewWrapper className="Dashboard-block-wrapper">
  <DashboardCard
 collectionName={collectionName}
 filter={filter}
 title={title}
  />
  </NodeViewWrapper>
  );
};
