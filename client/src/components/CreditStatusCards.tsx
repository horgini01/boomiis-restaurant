import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Loader2, Mail, MessageSquare } from 'lucide-react';

export function CreditStatusCards() {
  const { data: creditStatus, isLoading } = trpc.creditMonitoring.getCreditStatus.useQuery(
    undefined,
    {
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
      staleTime: 5 * 60 * 1000,
    }
  );

  if (isLoading) {
    return (
      <>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SMS Credits</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Email Credits</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </>
    );
  }

  if (!creditStatus) {
    return null;
  }

  const getStatusColor = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-amber-600 dark:text-amber-400';
      default:
        return 'text-green-600 dark:text-green-400';
    }
  };

  const getStatusBgColor = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: 'ok' | 'warning' | 'critical') => {
    switch (status) {
      case 'critical':
        return 'Critical';
      case 'warning':
        return 'Warning';
      default:
        return 'Healthy';
    }
  };

  const shouldBlink = (status: 'ok' | 'warning' | 'critical') => {
    return status === 'warning' || status === 'critical';
  };

  return (
    <>
      {/* SMS Credits Card */}
      <Card className={getStatusBgColor(creditStatus.sms.status)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">SMS Credits</CardTitle>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <div className={`text-2xl font-bold ${getStatusColor(creditStatus.sms.status)} ${shouldBlink(creditStatus.sms.status) ? 'animate-pulse' : ''}`}>
              {creditStatus.sms.balance}
            </div>
            <div className={`text-xs font-medium px-2 py-1 rounded-full ${
              creditStatus.sms.status === 'critical' 
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                : creditStatus.sms.status === 'warning'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {getStatusLabel(creditStatus.sms.status)}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {creditStatus.sms.provider.toUpperCase()} balance
          </p>
          {creditStatus.sms.message && (
            <p className={`text-xs mt-2 ${getStatusColor(creditStatus.sms.status)}`}>
              {creditStatus.sms.message}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Email Credits Card */}
      <Card className={getStatusBgColor(creditStatus.email.status)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Email Credits</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <div className={`text-2xl font-bold ${getStatusColor(creditStatus.email.status)} ${shouldBlink(creditStatus.email.status) ? 'animate-pulse' : ''}`}>
              {creditStatus.email.balance}
            </div>
            <div className={`text-xs font-medium px-2 py-1 rounded-full ${
              creditStatus.email.status === 'critical' 
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                : creditStatus.email.status === 'warning'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            }`}>
              {getStatusLabel(creditStatus.email.status)}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {creditStatus.email.provider.toUpperCase()} daily quota
          </p>
          {creditStatus.email.message && (
            <p className={`text-xs mt-2 ${getStatusColor(creditStatus.email.status)}`}>
              {creditStatus.email.message}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
