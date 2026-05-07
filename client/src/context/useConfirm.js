import { useContext } from "react";
import ConfirmDialogContext from "./confirmDialogContextValue";

export const useConfirm = () => {
  const confirm = useContext(ConfirmDialogContext);
  if (!confirm) {
    throw new Error("useConfirm must be used inside ConfirmDialogProvider");
  }
  return confirm;
};
