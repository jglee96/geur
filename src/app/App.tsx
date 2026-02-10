import { EditorWorkspacePage } from "@/pages/editor-workspace";
import { Toaster, ToastProviderInternal } from "@/shared/ui";

export function App() {
  return (
    <ToastProviderInternal>
      <EditorWorkspacePage />
      <Toaster />
    </ToastProviderInternal>
  );
}
