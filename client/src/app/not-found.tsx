import Link from 'next/link';
import { Coffee, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-coffee-100 text-coffee-800 flex items-center justify-center mx-auto shadow-sm">
          <Coffee className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-coffee-950">404</h1>
          <h2 className="mt-2 text-xl font-bold text-coffee-800">Page Not Found</h2>
          <p className="mt-2 text-sm text-coffee-600">
            The page you are looking for does not exist or may have been moved.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-forest-700 hover:bg-forest-800 text-white font-bold text-sm shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
