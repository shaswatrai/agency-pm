import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { QuickCapture } from "@/components/shell/QuickCapture";
import { ShortcutsHelp } from "@/components/shell/ShortcutsHelp";
import { AutomationEngineBoot } from "@/components/AutomationEngineBoot";

export default function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">{children}</main>
      </div>
      <QuickCapture />
      <ShortcutsHelp />
      <AutomationEngineBoot />
    </div>
  );
}
