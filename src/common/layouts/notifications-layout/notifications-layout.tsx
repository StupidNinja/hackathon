import { Outlet } from 'react-router-dom';

import { Toaster } from '@/common/components/ui/sonner';

export const NotificationsLayout = () => {
  return (
    <>
      <Toaster position="top-center" />
      <Outlet />
    </>
  );
};
