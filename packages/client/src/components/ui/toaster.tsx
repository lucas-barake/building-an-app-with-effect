import { useTheme } from "@/components/providers/theme-provider";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme satisfies ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:text-foreground group-[.toaster]:shadow-lg bg-background data-[type=error]:!bg-red-100 data-[type=error]:!border-red-200 data-[type=error]:dark:!bg-red-950 data-[type=error]:dark:!border-red-800 data-[type=success]:!bg-green-100 data-[type=success]:!border-green-200 data-[type=success]:dark:!bg-green-950 data-[type=success]:dark:!border-green-800 data-[type=warning]:!bg-amber-100 data-[type=warning]:!border-amber-200 data-[type=warning]:dark:!bg-amber-950 data-[type=warning]:dark:!border-amber-800 data-[type=info]:!bg-blue-100 data-[type=info]:!border-blue-200 data-[type=info]:dark:!bg-blue-950 data-[type=info]:dark:!border-blue-800",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:text-foreground group-data-[type=error]:!bg-red-100 group-data-[type=error]:!border-red-200 group-data-[type=error]:hover:!bg-red-200 group-data-[type=error]:hover:!border-red-300 group-data-[type=error]:dark:!bg-red-800 group-data-[type=error]:dark:!border-red-700 group-data-[type=error]:dark:hover:!bg-red-900 group-data-[type=error]:dark:hover:!border-red-800 group-data-[type=success]:!bg-green-100 group-data-[type=success]:!border-green-200 group-data-[type=success]:hover:!bg-green-200 group-data-[type=success]:hover:!border-green-300 group-data-[type=success]:dark:!bg-green-950/80 group-data-[type=success]:dark:!border-green-800 group-data-[type=success]:dark:hover:!bg-green-900 group-data-[type=success]:dark:hover:!border-green-700 group-data-[type=warning]:!bg-amber-100 group-data-[type=warning]:!border-amber-200 group-data-[type=warning]:hover:!bg-amber-200 group-data-[type=warning]:hover:!border-amber-300 group-data-[type=warning]:dark:!bg-amber-950/80 group-data-[type=warning]:dark:!border-amber-800 group-data-[type=warning]:dark:hover:!bg-amber-900 group-data-[type=warning]:dark:hover:!border-amber-700 group-data-[type=info]:!bg-blue-100 group-data-[type=info]:!border-blue-200 group-data-[type=info]:hover:!bg-blue-200 group-data-[type=info]:hover:!border-blue-300 group-data-[type=info]:dark:!bg-blue-950/80 group-data-[type=info]:dark:!border-blue-800 group-data-[type=info]:dark:hover:!bg-blue-900 group-data-[type=info]:dark:hover:!border-blue-700",
          icon: "group-data-[type=error]:text-red-500 group-data-[type=success]:text-green-500 group-data-[type=warning]:text-amber-500 group-data-[type=info]:text-blue-500",
        },
        duration: 5000,
      }}
      {...props}
    />
  );
};

export { Toaster };
