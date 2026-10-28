/**
 * Re-export of react-router-dom v6 for legacy imports across the codebase.
 * Components originally written against react-router-dom keep working
 * unchanged via `import { Link, useNavigate, ... } from "@/lib/react-router-shim"`.
 */
export {
  Link,
  NavLink,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
  useSearchParams,
} from "react-router-dom";
