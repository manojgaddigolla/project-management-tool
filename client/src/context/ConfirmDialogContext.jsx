import React, { useMemo, useState } from "react";
import ConfirmDialogContext from "./confirmDialogContextValue";
import "./ConfirmDialog.css";

export const ConfirmDialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);

  const confirm = useMemo(() => {
    return (options) =>
      new Promise((resolve) => {
        setDialog({
          confirmText: "Confirm",
          cancelText: "Cancel",
          tone: "default",
          ...options,
          resolve,
        });
      });
  }, []);

  const handleClose = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  const toneLabel =
    dialog?.tone === "danger" ? "Destructive action" : "Confirmation";

  return (
    <ConfirmDialogContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="confirm-backdrop" role="presentation">
          <div
            className="confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
          >
            <p className={`confirm-tone ${dialog.tone}`}>{toneLabel}</p>
            <h2 id="confirm-title">{dialog.title}</h2>
            {dialog.message && <p className="confirm-message">{dialog.message}</p>}
            <div className="confirm-actions">
              <button type="button" onClick={() => handleClose(false)}>
                {dialog.cancelText}
              </button>
              <button
                type="button"
                className={`confirm-primary ${dialog.tone}`}
                onClick={() => handleClose(true)}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmDialogContext.Provider>
  );
};
