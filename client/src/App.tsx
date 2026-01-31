import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { CartProvider } from "./contexts/CartContext";
import Home from "./pages/Home";
import Menu from "./pages/Menu";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Reservations from "./pages/Reservations";
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import CategoriesManagement from "./pages/admin/Categories";
import MenuItemsManagement from './pages/admin/MenuItems';
import BulkOperations from './pages/admin/BulkOperations';
import OrdersManagement from "./pages/admin/Orders";
import ReservationsManagement from "./pages/admin/ReservationsManagement";
import Analytics from "./pages/admin/Analytics";
import Kitchen from "./pages/Kitchen";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/menu"} component={Menu} />
      <Route path={"/cart"} component={Cart} />
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/order-success"} component={OrderSuccess} />
      <Route path={"/reservations"} component={Reservations} />
      <Route path={"/admin/login"} component={AdminLogin} />
      <Route path={"/admin/dashboard"} component={AdminDashboard} />
      <Route path={"/admin/categories"} component={CategoriesManagement} />          <Route path="/admin/menu-items" component={MenuItemsManagement} />
          <Route path="/admin/bulk-operations" component={BulkOperations} />      <Route path={"/admin/orders"} component={OrdersManagement} />
      <Route path={"/ admin/reservations"} component={ReservationsManagement} />
      <Route path={"/admin/analytics"} component={Analytics} />
      <Route path={"/kitchen"} component={Kitchen} />
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

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
      >
        <CartProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </CartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
