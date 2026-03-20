import { NavLink, useLocation } from 'react-router-dom';
import {
  Activity,
  Bell,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  MessageSquare,
  Package,
  Settings,
  ShoppingCart,
  Ticket,
  Users,
  Warehouse,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { BrandMark } from '@/components/common/BrandMark';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Products', url: '/products', icon: Package },
  { title: 'Orders', url: '/orders', icon: ShoppingCart },
  { title: 'Payments', url: '/payments', icon: CreditCard },
  { title: 'Customers', url: '/customers', icon: Users },
  { title: 'Inventory', url: '/inventory', icon: Warehouse },
  { title: 'Customer Service', url: '/customer-service', icon: LifeBuoy },
  { title: 'Monitoring', url: '/monitoring', icon: Activity },
  { title: 'Coupons', url: '/coupons', icon: Ticket },
  { title: 'Reviews', url: '/reviews', icon: MessageSquare },
  { title: 'Notices', url: '/notices', icon: Bell },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <div className="border-b border-sidebar-border/80 px-3 py-4">
        <BrandMark
          compact={collapsed}
          tone="sidebar"
          showTagline={!collapsed}
          className={cn(collapsed && 'justify-center')}
        />
      </div>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupLabel className="px-2 text-[11px] uppercase tracking-[0.2em] text-sidebar-muted">
            Service
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const active =
                  location.pathname === item.url ||
                  location.pathname.startsWith(`${item.url}/`);

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.title}
                      className="h-10 rounded-xl data-[active=true]:bg-sidebar-primary/20 data-[active=true]:text-sidebar-primary-foreground"
                    >
                      <NavLink to={item.url} className="flex items-center gap-3">
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!collapsed && (
          <div className="mx-2 mt-auto rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/60 p-3 text-xs text-sidebar-foreground/80">
            <p className="font-semibold text-sidebar-accent-foreground">Service Status</p>
            <p className="mt-1 leading-relaxed">
              Admin panel and homepage data are connected.
            </p>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

