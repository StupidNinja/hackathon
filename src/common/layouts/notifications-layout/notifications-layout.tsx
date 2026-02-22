import { Outlet } from 'react-router-dom';

import { ThemeToggle } from '@/common/components/theme-toggle';
import { Toaster } from '@/common/components/ui/sonner';

export const NotificationsLayout = () => {
  return (
    <>
      <div className="fixed right-4 top-3 z-50">
        <ThemeToggle className="shadow-sm" />
      </div>
      <Toaster position="top-center" />
      <Outlet />
    </>
  );
};
