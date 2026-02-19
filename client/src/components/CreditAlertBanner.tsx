import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, XCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

export function CreditAlertBanner() {
  const { data: creditStatus, isLoading } = trpc.creditMonitoring.getCreditStatus.useQuery(
    undefined,
    {
      refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
      staleTime: 5 * 60 * 1000,
    }
  );

  if (isLoading || !creditStatus || !creditStatus.hasAlerts) {
    return null;
  }

  const alerts = [];

  // Check SMS credits
  if (creditStatus.sms.status !== 'ok') {
    alerts.push({
      type: creditStatus.sms.status,
      provider: creditStatus.sms.provider,
      message: creditStatus.sms.message || 'SMS credits low',
      balance: creditStatus.sms.balance,
    });
  }

  // Check email credits
  if (creditStatus.email.status !== 'ok') {
    alerts.push({
      type: creditStatus.email.status,
      provider: creditStatus.email.provider,
      message: creditStatus.email.message || 'Email credits low',
      balance: creditStatus.email.balance,
    });
  }

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {alerts.map((alert, index) => (
        <Alert
          key={index}
          variant={alert.type === 'critical' ? 'destructive' : 'default'}
          className={
            alert.type === 'critical'
              ? 'border-red-600 bg-red-50 dark:bg-red-950'
              : 'border-amber-600 bg-amber-50 dark:bg-amber-950'
          }
        >
          {alert.type === 'critical' ? (
            <XCircle className="h-5 w-5" />
          ) : (
            <AlertTriangle className="h-5 w-5" />
          )}
          <AlertTitle className="font-semibold">
            {alert.type === 'critical' ? '🚨 URGENT' : '⚠️ Warning'}: Low{' '}
            {alert.provider.toUpperCase()} Credits
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm">{alert.message}</p>
                <p className="text-xs mt-1 opacity-75">
                  Current balance: <span className="font-semibold">{alert.balance} credits</span>
                </p>
              </div>
              {alert.type === 'critical' && (
                <div className="ml-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-600 text-white">
                    Action Required
                  </span>
                </div>
              )}
            </div>
            {alert.type === 'critical' && (
              <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded border border-red-200 dark:border-red-800">
                <p className="text-xs font-medium text-red-900 dark:text-red-100">
                  ⚠️ Service Disruption Risk: Without immediate action, you may lose the ability to
                  communicate with customers via {alert.provider === 'resend' ? 'email' : 'SMS'}.
                </p>
              </div>
            )}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
