import "@heroui/react";

declare module "@heroui/react" {
  interface InputProps {
    clearable?: boolean;
    bordered?: boolean;
    fullWidth?: boolean;
  }

  interface ButtonProps {
    auto?: boolean;
  }

  interface ModalProps {
    Modal?: boolean;
  }
}

