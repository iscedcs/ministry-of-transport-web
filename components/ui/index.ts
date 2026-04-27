/**
 * UI Component Library — Ministry of Transport Platform
 *
 * All components use Tailwind CSS + shadcn/ui primitives.
 * Native CSS only where complex animations are required.
 */

// ── Primitives (shadcn) ─────────────────────────────────────────────────────
export { Button, buttonVariants } from "./button";
export type { ButtonProps } from "./button";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";
// Alias for backward-compat with existing code that uses CardBody
export { CardContent as CardBody } from "./card";

export { Badge, badgeVariants, StatusPill } from "./badge";
export type { BadgeProps } from "./badge";

export { Alert, AlertTitle, AlertDescription } from "./alert";

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "./dialog";
export { Modal } from "./modal";
export type { ModalProps } from "./modal";

export { Input } from "./input";
export { Textarea } from "./textarea";
export { Label } from "./label";
export { Checkbox } from "./checkbox";
export { Separator } from "./separator";

export {
  Select as ShadcnSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./select";

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

// ── Custom form primitives (server-action-compatible) ───────────────────────
export {
  FormGroup,
  Label as FormLabel,
  Input as FormInput,
  Select as FormSelect,
  NativeSelect,
  Textarea as FormTextarea,
  Checkbox as FormCheckbox,
  Radio,
  FormHint,
  FormError,
} from "./form";

// ── Navigation & Data ───────────────────────────────────────────────────────
export { Pagination } from "./pagination";
export { DataTable } from "./data-table";

// ── Utility ─────────────────────────────────────────────────────────────────
export {
  Spinner,
  Skeleton,
  Avatar,
  Divider,
  EmptyState,
  StatCard,
} from "./misc";
