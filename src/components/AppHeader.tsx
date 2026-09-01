import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/use-auth";

export function AppHeader() {
  const { user, loading } = useAuth();
  return (
    <header className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur">
      <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center">
          <Logo size={24} />
        </Link>
        {!loading && (
          <nav className="flex items-center gap-2 text-sm">
            {user ? (
              <Link
                to="/dashboard"
                className="rounded-xl bg-primary text-primary-foreground font-semibold px-4 py-2"
              >
                Meu app
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  search={{ mode: "login" }}
                  className="rounded-xl border font-semibold px-3 py-2"
                >
                  Entrar
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="rounded-xl bg-primary text-primary-foreground font-bold px-4 py-2"
                >
                  Criar conta
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
