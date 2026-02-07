import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useSettings } from "@/hooks/useSettings";
import { useEffect } from "react";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import MenuItemDetail from "./pages/MenuItemDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Reservations from "./pages/Reservations";
import EventsCatering from "./pages/EventsCatering";
import Contact from "./pages/Contact";
import { Gallery } from "./pages/Gallery";
import { About } from "./pages/About";
import { Blog } from "./pages/Blog";
import { BlogArticle } from "./pages/BlogArticle";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import CategoriesManagement from "./pages/admin/Categories";
import MenuItemsManagement from './pages/admin/MenuItems';

import OrdersManagement from "./pages/admin/Orders";
import ReservationsManagement from "./pages/admin/ReservationsManagement";
import EventsManagement from "./pages/admin/EventsManagement";
import Analytics from "./pages/admin/Analytics";
import Settings from "./pages/admin/Settings";
import RestaurantSettings from "./pages/admin/RestaurantSettings";
import EmailDelivery from "./pages/admin/EmailDelivery";
import NewsletterSubscribers from "./pages/admin/NewsletterSubscribers";
import EmailCampaigns from "./pages/admin/EmailCampaigns";
import SMSTemplates from "./pages/admin/SMSTemplates";
import { ReviewsManagement } from "./pages/admin/ReviewsManagement";
import TestimonialsManagement from "./pages/admin/Testimonials";
import ResponseTemplates from "./pages/admin/ResponseTemplates";
import SubmitTestimonial from "./pages/SubmitTestimonial";
import { GalleryManagement } from "./pages/admin/GalleryManagement";
import { BlogManagement } from "./pages/admin/BlogManagement";
import AboutContentManagement from "./pages/admin/AboutContentManagement";
import LegalPagesManagement from "./pages/admin/LegalPagesManagement";
import AdminUsers from "./pages/admin/AdminUsers";
import RolePermissions from "./pages/admin/RolePermissions";
import CustomRoles from "./pages/admin/CustomRoles";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsConditions from "./pages/TermsConditions";
import Accessibility from "./pages/Accessibility";
import Kitchen from "./pages/Kitchen";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/menu/:id"} component={MenuItemDetail} />
      <Route path={"/menu"} component={Menu} />
      <Route path={"/cart"} component={Cart} />
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/order-success"} component={OrderSuccess} />
      <Route path={"/reservations"} component={Reservations} />
      <Route path={"/events-catering"} component={EventsCatering} />
      <Route path={"/events"}>{() => <Redirect to="/events-catering" />}</Route>
      <Route path={"/contact"} component={Contact} />
      <Route path={"/gallery"} component={Gallery} />
      <Route path={"/about"} component={About} />
      <Route path="/blog/:slug" component={BlogArticle} />
      <Route path="/blog" component={Blog} />
      <Route path="/privacy-policy" component={PrivacyPolicy} />
      <Route path="/terms-conditions" component={TermsConditions} />
      <Route path="/accessibility" component={Accessibility} />
      <Route path="/submit-testimonial" component={SubmitTestimonial} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/categories" component={CategoriesManagement} />
      <Route path="/admin/menu-items" component={MenuItemsManagement} />

      <Route path="/admin/orders" component={OrdersManagement} />
      <Route path="/admin/reservations" component={ReservationsManagement} />
      <Route path="/admin/events" component={EventsManagement} />
      <Route path={"/admin/analytics"} component={Analytics} />
      <Route path={"/admin/users"} component={AdminUsers} />
      <Route path={"/admin/role-permissions"} component={RolePermissions} />
      <Route path={"/admin/custom-roles"} component={CustomRoles} />
      <Route path={"/admin/settings"} component={Settings} />
      <Route path={"/admin/restaurant-settings"} component={RestaurantSettings} />
      <Route path={"/admin/email-delivery"} component={EmailDelivery} />
      <Route path="/admin/newsletter-subscribers" component={NewsletterSubscribers} />
      <Route path="/admin/sms-templates" component={SMSTemplates} />
      <Route path="/admin/reviews" component={ReviewsManagement} />
      <Route path="/admin/testimonials" component={TestimonialsManagement} />
      <Route path="/admin/response-templates" component={ResponseTemplates} />
      <Route path="/admin/gallery" component={GalleryManagement} />
      <Route path="/admin/blog" component={BlogManagement} />
      <Route path="/admin/about-content" component={AboutContentManagement} />
      <Route path="/admin/legal-pages" component={LegalPagesManagement} />
      <Route path="/admin/email-campaigns" component={EmailCampaigns} />
      <Route path="/kitchen" component={Kitchen} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function AppContent() {
  const { settings } = useSettings();

  // Update favicon dynamically
  useEffect(() => {
    const favicon = settings?.favicon;
    if (favicon) {
      // Remove existing favicon links
      const existingLinks = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]');
      existingLinks.forEach(link => link.remove());

      // Add new favicon link
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = favicon;
      document.head.appendChild(link);
    }
  }, [settings?.favicon]);

  return <Router />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <AppContent />
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
