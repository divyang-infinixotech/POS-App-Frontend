import React from 'react';
import PageContainer from '../common/PageContainer';
import PageHeader from '../common/PageHeader';

export default function ManagementPage({
  title,
  subtitle,
  actions,
  toolbar,
  children,
}) {
  return (
    <PageContainer>
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
      {toolbar && <div className="flex flex-col sm:flex-row gap-2">{toolbar}</div>}
      {children}
    </PageContainer>
  );
}
