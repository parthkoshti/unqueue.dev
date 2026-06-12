import { useEffect } from "react";

interface PageMetaProps {
  title: string;
  description?: string;
}

export function usePageMeta({ title, description }: PageMetaProps) {
  useEffect(() => {
    document.title = title;
    if (description) {
      let el = document.querySelector<HTMLMetaElement>('meta[name="description"]');
      if (!el) {
        el = document.createElement("meta");
        el.name = "description";
        document.head.appendChild(el);
      }
      el.content = description;
    }
    return () => {
      document.title = "unqueue — BullMQ Monitoring Dashboard";
    };
  }, [title, description]);
}
