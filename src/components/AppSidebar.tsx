import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, FileText, Settings, LogOut, History, Repeat } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useNavigate } from "react-router-dom";
const menuItems = [{
  title: "Dashboard",
  url: "/",
  icon: LayoutDashboard
}, {
  title: "Billing",
  url: "/billing",
  icon: FileText
}, {
  title: "Old Exchange",
  url: "/old-gold-exchange",
  icon: Repeat
}, {
  title: "Bill History",
  url: "/bill-history",
  icon: History
}, {
  title: "Settings",
  url: "/settings",
  icon: Settings
}];
export function AppSidebar() {
  const {
    state
  } = useSidebar();
  const navigate = useNavigate();
  const isCollapsed = state === "collapsed";
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const handleLogout = () => {
    localStorage.removeItem("mgm_user");
    navigate("/login");
    setShowLogoutDialog(false);
  };
  return <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-[hsl(215,45%,25%)]">
        {/* Logo Section */}
        <div className="p-6 border-b border-white/10">
          {!isCollapsed ? <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-white">
                MGM Jewellers
              </h2>
              <p className="text-xs text-white/70 uppercase tracking-wider">Smart Billing System</p>
            </div> : <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>}
        </div>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : "text-sm font-semibold text-white/70 uppercase tracking-wider px-4 py-3"}>
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-3 mt-2">
            <div className="space-y-1">
              {menuItems.map(item => <NavLink key={item.title} to={item.url} end={item.url === "/"} className={({
              isActive
            }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? "bg-white text-[hsl(215,45%,25%)] font-medium" : "text-white hover:bg-white/10"}`}>
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-base">{item.title}</span>}
                </NavLink>)}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Logout Button */}
        <div className="mt-auto p-4">
          <button onClick={() => setShowLogoutDialog(true)} className={`flex items-center gap-3 px-4 py-3 rounded-lg w-full bg-red-600 text-white hover:bg-red-700 transition-colors ${isCollapsed ? "justify-center" : ""}`}>
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-base font-medium">Logout</span>}
          </button>
        </div>
      </SidebarContent>

      {/* Logout Confirmation Dialog */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the login page and will need to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-600 hover:bg-red-700 text-gray-50">
              Yes, Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>;
}