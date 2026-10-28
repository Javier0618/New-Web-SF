import { Link, useLocation } from "@/lib/react-router-shim";
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavLinkCompatProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  end?: boolean;
  children?: ReactNode;
};

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(function NavLink(
  { className, activeClassName, pendingClassName: _pendingClassName, to, end, children, ...props },
  ref,
) {
  const location = useLocation();
  const isActive = end
    ? location.pathname === to
    : location.pathname === to || location.pathname.startsWith(to + "/");
  return (
    <Link
      ref={ref}
      to={to}
      className={cn(className, isActive && activeClassName)}
      {...(props as Record<string, unknown>)}
    >
      {children}
    </Link>
  );
});

export { NavLink };
