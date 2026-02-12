import { useNavigate } from "react-router-dom";

type NavigateOptions = {
  replace?: boolean;
};

export function useRouter() {
  const navigate = useNavigate();

  return {
    push: (to: string, options?: NavigateOptions) =>
      navigate(to, options?.replace ? { replace: true } : undefined),
    replace: (to: string) => navigate(to, { replace: true }),
    back: () => navigate(-1),
    refresh: () => navigate(0),
  };
}

