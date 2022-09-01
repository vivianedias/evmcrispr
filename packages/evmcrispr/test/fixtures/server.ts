import type { DefaultBodyType, PathParams } from 'msw';
import { graphql, rest } from 'msw';
import { setupServer } from 'msw/node';

import { artifacts } from './artifacts/';
import { DAOs, REPOs } from './subgraph-data';
import tokenListFixture from './tokenlist/uniswap.json';
import { IPFS_GATEWAY } from '../../src/IPFSResolver';
import { addressesEqual } from '../../src/utils';

const PINATA_AUTH = `Bearer ${process.env.VITE_PINATA_JWT}`;

const handlers = [
  graphql.query<Record<string, any>, { repoName: string }>(
    'Repos',
    (req, res, ctx) => {
      const repoName = req.variables.repoName;

      const selectedRepo = REPOs[repoName as keyof typeof REPOs];

      return res(
        ctx.status(200),
        ctx.data({
          repos: selectedRepo ? selectedRepo.data.repos : [],
        }),
      );
    },
  ),
  graphql.query<Record<string, any>, { id: string }>(
    'Organization',
    (req, res, ctx) => {
      const id = req.variables.id;

      const daoAddresses = Object.keys(DAOs);
      const dao =
        DAOs[
          daoAddresses.find((addr) =>
            addressesEqual(addr, id),
          ) as keyof typeof DAOs
        ];

      return res(
        ctx.status(200),
        ctx.data({
          organization: dao ? dao.data.organization : null,
        }),
      );
    },
  ),
  rest.get<DefaultBodyType, { cid: string; resource: string }>(
    `${IPFS_GATEWAY}:cid/:resource`,
    (req, res, ctx) => {
      const { cid, resource } = req.params;

      try {
        if (resource === 'artifact.json') {
          const artifact = artifacts[cid as keyof typeof artifacts];

          if (!artifact) {
            return res(ctx.status(404));
          }

          return res(ctx.status(200), ctx.json(artifact));
        }
      } catch (err) {
        console.log(err);
      }
    },
  ),
  rest.get('https://tokens.uniswap.org/', (_, res, ctx) => {
    return res(ctx.status(200), ctx.json(tokenListFixture));
  }),
  rest.post<
    {
      pinataOptions: { cidVersion: number };
      pinataMetadata: { name: string };
      pinataContent: string;
    },
    PathParams<string>,
    { IpfsHash?: string; error?: { reason: string; details: string } }
  >('https://api.pinata.cloud/pinning/pinJSONToIPFS', (req, res, ctx) => {
    const auth = req.headers.get('authorization');

    if (!auth || auth !== PINATA_AUTH) {
      return res(
        ctx.status(200),
        ctx.json({
          error: {
            reason: 'INVALID_CREDENTIALS',
            details: 'Invalid/expired credentials',
          },
        }),
      );
    }

    const content = req.body.pinataContent as keyof typeof contentToCid;

    const contentToCid = {
      'This should be pinned in IPFS':
        'QmeA34sMpR2EZfVdPsxYk7TMLxmQxhcgNer67UyTkiwKns',
    };

    return res(
      ctx.status(200),
      ctx.json({
        IpfsHash: contentToCid[content] ?? '',
      }),
    );
  }),
];

export const server = setupServer(...handlers);
