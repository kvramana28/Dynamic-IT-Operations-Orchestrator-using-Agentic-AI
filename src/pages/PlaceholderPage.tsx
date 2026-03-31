import { useLocation } from 'react-router-dom';

export default function PlaceholderPage() {
  const location = useLocation();
  const title = location.pathname.substring(1).split('/')[0];
  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{capitalizedTitle}</h2>
      <p className="text-slate-500 dark:text-slate-400 max-w-md">
        This page is currently under construction. Check back later for updates to the {capitalizedTitle} module.
      </p>
    </div>
  );
}
