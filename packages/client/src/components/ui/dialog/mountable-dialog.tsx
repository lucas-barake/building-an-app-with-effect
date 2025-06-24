import * as React from "react";

const useDelayedUnmount = (isMounted: boolean, delay: number) => {
  const [shouldRender, setShouldRender] = React.useState(isMounted);

  React.useEffect(() => {
    if (isMounted) {
      setShouldRender(true);
    } else {
      const timeoutId = setTimeout(() => {
        setShouldRender(false);
      }, delay);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [isMounted, delay]);

  return shouldRender;
};

type Props = {
  children: React.ReactNode;
  open: boolean;
  delay?: number;
};

export const MountableDialog: React.FC<Props> = ({ children, delay = 200, open }) => {
  const shouldRender = useDelayedUnmount(open, delay);
  return shouldRender ? children : null;
};
