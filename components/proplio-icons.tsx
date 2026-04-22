import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function iconClass(className?: string) {
  return ["h-5 w-5 shrink-0", className].filter(Boolean).join(" ");
}

export function IconHome({ className, ...p }: IconProps) {
  return (
    <svg className={iconClass(className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

export function IconChart({ className, ...p }: IconProps) {
  return (
    <svg className={iconClass(className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

export function IconBuilding({ className, ...p }: IconProps) {
  return (
    <svg className={iconClass(className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008H17.25v-.008Zm0 3h.008v.008H17.25v-.008Zm0 3h.008v.008H17.25v-.008Z" />
    </svg>
  );
}

export function IconUsers({ className, ...p }: IconProps) {
  return (
    <svg className={iconClass(className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
  );
}

export function IconDocument({ className, ...p }: IconProps) {
  return (
    <svg className={iconClass(className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

export function IconContract({ className, ...p }: IconProps) {
  return (
    <svg className={iconClass(className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12H9.75m4.5 0v.75m0 0H9.75m3 0h3.375m-9.75 3.75h6.375a1.125 1.125 0 0 0 1.125-1.125V11.25a9 9 0 0 0-9-9H4.125A1.125 1.125 0 0 0 3 3.375v17.25c0 .621.504 1.125 1.125 1.125h9.75" />
    </svg>
  );
}

export function IconClipboard({ className, ...p }: IconProps) {
  return (
    <svg className={iconClass(className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7.125A2.25 2.25 0 0 0 4.875 7.125v12.75A2.25 2.25 0 0 0 7.125 22h9.75a2.25 2.25 0 0 0 2.25-2.25V7.125A2.25 2.25 0 0 0 16.875 5H15M9 5a2.25 2.25 0 0 0 2.25 2.25h1.5A2.25 2.25 0 0 0 15 5m-6 0V3.75A1.125 1.125 0 0 1 9.125 2.625h5.25A1.125 1.125 0 0 1 15.375 3.75V5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 15.75h6M9 9.75h3" />
    </svg>
  );
}

export function IconCog({ className, ...p }: IconProps) {
  return (
    <svg className={iconClass(className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

export function IconPencil({ className, ...p }: IconProps) {
  return (
    <svg className={iconClass(className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
  );
}

export function IconTrash({ className, ...p }: IconProps) {
  return (
    <svg className={iconClass(className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

export function IconDeviceCamera({ className, ...p }: IconProps) {
  return (
    <svg className={iconClass(className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} {...p}>
      <rect x="5" y="2" width="14" height="20" rx="2" strokeLinejoin="round" />
      <circle cx="12" cy="14" r="3.25" />
      <path strokeLinecap="round" d="M9 5.5h6" />
    </svg>
  );
}

export function IconPlus({ className, ...p }: IconProps) {
  return (
    <svg className={iconClass(className)} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...p}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}
