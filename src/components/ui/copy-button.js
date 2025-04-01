import { Button } from './button';
import { CopyIcon, CheckIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

export function CopyButton({ textToCopy }) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {isCopied ? (
        <CheckIcon className="h-4 w-4 mr-2" />
      ) : (
        <CopyIcon className="h-4 w-4 mr-2" />
      )}
      {isCopied ? 'Copied!' : 'Copy'}
    </Button>
  );
}