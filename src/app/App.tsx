import { EditorWorkspacePage } from "@/pages/editor-workspace";
import { Toaster, ToastProviderInternal } from "@/shared/ui";
import { AppErrorBoundary } from "./AppErrorBoundary";

export function App() {
  return (
    <ToastProviderInternal>
      <AppErrorBoundary>
        <EditorWorkspacePage />
      </AppErrorBoundary>
      <Toaster />
    </ToastProviderInternal>
  );
}
