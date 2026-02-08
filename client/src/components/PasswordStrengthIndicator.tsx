import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthCheck {
  label: string;
  test: (password: string) => boolean;
}

const strengthChecks: StrengthCheck[] = [
  { label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { label: 'Contains uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Contains lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Contains number', test: (p) => /[0-9]/.test(p) },
  { label: 'Contains special character', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const results = useMemo(() => {
    return strengthChecks.map(check => ({
      ...check,
      passed: check.test(password),
    }));
  }, [password]);

  const passedCount = results.filter(r => r.passed).length;
  const strength = passedCount === 0 ? 'none' : 
                   passedCount <= 2 ? 'weak' : 
                   passedCount <= 3 ? 'medium' : 
                   passedCount <= 4 ? 'good' : 'strong';

  const strengthColors = {
    none: 'bg-gray-200',
    weak: 'bg-red-500',
    medium: 'bg-orange-500',
    good: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  const strengthLabels = {
    none: '',
    weak: 'Weak',
    medium: 'Medium',
    good: 'Good',
    strong: 'Strong',
  };

  if (!password) return null;

  return (
    <div className="space-y-3 mt-2">
      {/* Strength bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Password strength:</span>
          <span className={`font-medium ${
            strength === 'weak' ? 'text-red-600' :
            strength === 'medium' ? 'text-orange-600' :
            strength === 'good' ? 'text-yellow-600' :
            strength === 'strong' ? 'text-green-600' : ''
          }`}>
            {strengthLabels[strength]}
          </span>
        </div>
        <div className="flex gap-1 h-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-colors ${
                i <= passedCount ? strengthColors[strength] : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1.5">
        {results.map((result, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            {result.passed ? (
              <Check className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
            )}
            <span className={result.passed ? 'text-green-600' : 'text-muted-foreground'}>
              {result.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
