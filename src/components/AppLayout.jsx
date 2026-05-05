import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-transparent px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto min-h-[calc(100vh-2rem)] max-w-[1440px] overflow-hidden rounded-[40px] border border-line/80 bg-app shadow-hero lg:grid lg:grid-cols-[272px_minmax(0,1fr)]">
        <Sidebar />
        <main className="min-h-screen px-4 pb-24 pt-6 sm:px-6 lg:min-h-[calc(100vh-2rem)] lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
