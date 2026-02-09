export function Footer() {
  return (
    <footer className="border-t border-zinc-800 bg-black">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-white">AI Architect</h3>
            <p className="text-sm text-zinc-500 mt-1">
              AI-powered floor plans. Danish building code compliant.
            </p>
          </div>

          <div className="flex items-center gap-6 text-sm text-zinc-400">
            <a
              href="mailto:Jakobsanderhoff@gmail.com"
              className="hover:text-white transition-colors"
            >
              Jakobsanderhoff@gmail.com
            </a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-zinc-800 text-center text-xs text-zinc-600">
          &copy; {new Date().getFullYear()} AI Architect. Copenhagen, Denmark.
        </div>
      </div>
    </footer>
  );
}
