import { Env } from '@lombard.finance/sdk-common';
import React, { useEffect } from 'react';

import { IOutput, useFetchOutputs } from '../../hooks/useFetchOutputs';
import { Button } from '../Button/Button';
import { ErrorDisplay } from '../ErrorDisplay/ErrorDisplay';
import { SelectField } from '../SelectField/SelectField';
import { Spinner } from '../Spinner';

interface OutputSelectorProps {
  address: string | undefined;
  environment: Env;
  isConnected: boolean;
  selectedOutput: IOutput | null;
  onOutputSelect: (output: IOutput | null) => void;
  className?: string;
}

export const OutputSelector: React.FC<OutputSelectorProps> = ({
  address,
  environment,
  isConnected,
  selectedOutput,
  onOutputSelect,
  className = '',
}) => {
  const { outputs, isLoadingOutputs, outputsError, refetchOutputs } =
    useFetchOutputs({
      address: address,
      environment,
      isConnected: isConnected,
    });

  // biome-ignore lint/correctness/useExhaustiveDependencies: Intentionally reset only on context change
  useEffect(() => {
    onOutputSelect(null);
  }, [isConnected, address, environment, onOutputSelect]);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'NOTARIZATION_STATUS_SESSION_APPROVED':
        return 'Ready to mint';
      case 'NOTARIZATION_STATUS_PENDING':
        return 'Pending';
      case 'NOTARIZATION_STATUS_SUBMITTED':
        return 'Submitted';
      case 'NOTARIZATION_STATUS_FAILED':
        return 'Failed';
      case 'NOTARIZATION_STATUS_GMP_HANDLED':
        return 'Auto-claimed';
      default:
        return status;
    }
  };

  const outputOptions = [
    { value: '', label: '-- Select a Bitcoin transaction --' },
    ...outputs.map(output => ({
      value: output.txid,
      label: `${output.txid.substring(0, 10)}... - ${
        Number.parseFloat(output.value) / 10 ** 8
      } BTC [${statusLabel(output.notarization_status)}]`,
    })),
  ];

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = outputs.find(o => o.txid === e.target.value);
    onOutputSelect(selected || null);
  };

  return (
    <div className={className}>
      {isLoadingOutputs ? (
        <div className="d-flex align-items-center">
          <Spinner size="sm" />
          <span className="ms-2">Loading available outputs...</span>
        </div>
      ) : outputsError ? (
        <ErrorDisplay error={outputsError} title="Could not load outputs" />
      ) : outputs.length === 0 ? (
        <div className="alert alert-info">
          No pending Bitcoin outputs found for your address (
          {address?.substring(0, 6)}...) on {environment}. You might need to stake
          Bitcoin first or check the selected network.
        </div>
      ) : (
        <>
          <SelectField
            id="output-select"
            label="Select Output to Claim"
            value={selectedOutput?.txid || ''}
            onChange={handleSelectChange}
            options={outputOptions}
            aria-label="Select Bitcoin transaction to claim"
          />

          {selectedOutput && (
            <div className="card bg-light mt-3">
              <div className="card-body py-2 small">
                <h6 className="mb-2">Selected Output Details:</h6>
                <p className="mb-1">
                  <strong>TxID:</strong> {selectedOutput.txid}
                </p>
                <p className="mb-1">
                  <strong>Amount:</strong>{' '}
                  {Number.parseFloat(selectedOutput.value) / 10 ** 8} BTC
                </p>
                <p className="mb-1">
                  <strong>Block Height:</strong>{' '}
                  {selectedOutput.block_height || 'N/A'}
                </p>
                <p className="mb-1">
                  <strong>Status:</strong>{' '}
                  {statusLabel(selectedOutput.notarization_status)}
                </p>
                {selectedOutput.token_address && (
                  <p className="mb-1">
                    <strong>Token:</strong> {selectedOutput.token_address}
                  </p>
                )}
                {selectedOutput.raw_payload ? (
                  <span className="badge bg-success">Has payload</span>
                ) : (
                  <span className="badge bg-warning text-dark">
                    Awaiting notarization
                  </span>
                )}
                {selectedOutput.proof && (
                  <span className="badge bg-success ms-1">Has proof</span>
                )}
              </div>
            </div>
          )}
        </>
      )}
      <div style={{ marginTop: '1rem' }}>
        <Button
          size="small"
          onClick={refetchOutputs}
          disabled={isLoadingOutputs}
          isLoading={isLoadingOutputs}
        >
          Refresh Outputs
        </Button>
      </div>
    </div>
  );
};
