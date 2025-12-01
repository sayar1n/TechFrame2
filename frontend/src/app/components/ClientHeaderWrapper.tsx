'use client';

import dynamic from 'next/dynamic';

const Header = dynamic(() => import('@/app/components/Header'), { ssr: false });

const ClientHeaderWrapper = () => {
  return <Header />;
};

export default ClientHeaderWrapper;
