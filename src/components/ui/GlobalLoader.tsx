import React from "react";
import { useGlobalLoader } from "../../store";

export default function GlobalLoader() {
  const isFullPageLoading = useGlobalLoader((state) => state.isLoading);

  return (
    <React.Fragment>
      {isFullPageLoading && (
        <div className="spinner">
          <div className="spinner-container">
            <div className="spinner-loader"></div>
          </div>
        </div>
      )}
    </React.Fragment>
  );
}



