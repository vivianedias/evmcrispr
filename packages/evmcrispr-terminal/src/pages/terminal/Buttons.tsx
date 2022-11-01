import { useEffect, useRef, useState } from 'react';
import { EVMcrispr, isProviderAction, parseScript } from '@1hive/evmcrispr';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { useConnect } from 'wagmi';

import type { Action, ForwardOptions } from '@1hive/evmcrispr';
import type { providers } from 'ethers';
import type { Connector } from 'wagmi';

import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Collapse,
  VStack,
} from '@chakra-ui/react';

import { terminalStoreActions } from './useTerminalStore';

function ErrorMsg({ errors }: { errors: string[] }) {
  const [showCollapse, setShowCollapse] = useState(false);
  const [showExpandBtn, setShowExpandBtn] = useState(false);

  const COLLAPSE_THRESHOLD = 30;
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!errors.length) {
      setShowExpandBtn(false);
    } else if (contentRef.current) {
      setShowExpandBtn(contentRef.current.clientHeight > COLLAPSE_THRESHOLD);
    }
  }, [errors]);

  return (
    <Box
      display="flex"
      flexDirection="column"
      justifyContent="left"
      maxWidth="100%"
      wordBreak="break-all"
    >
      {errors.map((e, index) => (
        <Alert key={index} status="error">
          <Box display="flex" alignItems="flex-start">
            <AlertIcon />
            <AlertDescription>
              <Collapse startingHeight={COLLAPSE_THRESHOLD} in={showCollapse}>
                <div ref={contentRef}>{e}</div>
              </Collapse>
            </AlertDescription>
          </Box>
        </Alert>
      ))}
      {showExpandBtn ? (
        <Button
          width="30"
          alignSelf="flex-end"
          size="sm"
          onClick={() => setShowCollapse((show) => !show)}
          mt="1rem"
        >
          Show {showCollapse ? 'Less' : 'More'}
        </Button>
      ) : null}
    </Box>
  );
}

// TODO: Migrate logic to evmcrispr
const executeActions = async (
  actions: Action[],
  connector: Connector,
  options?: ForwardOptions,
): Promise<providers.TransactionReceipt[]> => {
  const txs = [];

  if (!(connector instanceof InjectedConnector)) {
    throw new Error(
      `Provider action-returning commands are only supported by injected wallets (e.g. Metamask)`,
    );
  }

  for (const action of actions) {
    if (isProviderAction(action)) {
      const [chainParam] = action.params;

      await connector.switchChain(Number(chainParam.chainId));
    } else {
      const signer = await connector.getSigner();
      txs.push(
        await (
          await signer.sendTransaction({
            ...action,
            gasPrice: options?.gasPrice,
            gasLimit: options?.gasLimit,
          })
        ).wait(),
      );
    }
  }
  return txs;
};

type TerminalButtonsType = {
  terminalStore: {
    errors: string[];
    isLoading: boolean;
    script: string;
  };
  address: string;
};

export default function TerminalButtons({
  terminalStore: { errors, isLoading, script },
  address = '',
}: TerminalButtonsType) {
  const { activeConnector } = useConnect();
  const [url] = useState('');

  const addressShortened = `${address.slice(0, 6)}..${address.slice(-4)}`;

  async function onExecute() {
    terminalStoreActions.errors([]);
    terminalStoreActions.isLoading(true);

    try {
      const signer = await activeConnector?.getSigner();
      if (!activeConnector || signer === undefined || signer === null)
        throw new Error('Account not connected');

      const { ast, errors } = parseScript(script);

      if (errors.length) {
        terminalStoreActions.isLoading(false);
        terminalStoreActions.errors(errors);
        return;
      }
      const actions = await new EVMcrispr(ast, signer).interpret();

      await executeActions(actions, activeConnector, { gasLimit: 10_000_000 });

      // TODO: adapt to cas11 changes
      // const chainId = (await signer.provider?.getNetwork())?.chainId;
      // setUrl(`https://${client(chainId)}/#/${connectedDAO.kernel.address}/${}`);
    } catch (err: any) {
      const e = err as Error;
      console.error(e);
      if (
        e.message.startsWith('transaction failed') &&
        /^0x[0-9a-f]{64}$/.test(e.message.split('"')[1])
      ) {
        terminalStoreActions.errors([
          `Transaction failed, watch in block explorer ${
            e.message.split('"')[1]
          }`,
        ]);
      } else {
        terminalStoreActions.errors([e.message]);
      }
    } finally {
      terminalStoreActions.isLoading(false);
    }
  }

  return (
    <VStack mt={3} alignItems="flex-end" gap={3} pr={{ base: 6, lg: 0 }}>
      {address ? (
        <>
          {url ? (
            <Button
              variant="warning"
              onClick={() => window.open(url, '_blank')}
            >
              Go to vote
            </Button>
          ) : null}

          <Button
            variant="lime"
            isLoading={isLoading}
            onClick={onExecute}
            // disabled={isLoading}
            loadingText={`Forwarding from ${addressShortened}`}
          >
            Forward from {addressShortened}
          </Button>
        </>
      ) : null}

      {errors ? <ErrorMsg errors={errors} /> : null}
    </VStack>
  );
}
