import { Route, Switch } from "wouter";
import Index from "./pages/Index";
import Settings from "./pages/Settings";
import { LeadStatusProvider } from "./contexts/LeadStatusContext";

const WhatsAppPlatform = () => {
  return (
    <LeadStatusProvider>
      <Switch>
        <Route path="/whatsapp/settings" component={Settings} />
        <Route path="/whatsapp" component={Index} />
      </Switch>
    </LeadStatusProvider>
  );
};

export default WhatsAppPlatform;
