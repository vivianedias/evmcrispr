import type { BigNumberish, Signer, providers, utils } from 'ethers';

import type EVMcrispr from '../EVMcrispr';

import type { AppArtifact, AragonArtifact } from './aragon';

export * from './aragon';

// ---------------------- TYPES ----------------------

export type ActionFunction = () => Promise<Action[]>;

export type Helpers = {
  [name: string]: (evm: EVMcrispr, ...rest: string[]) => any;
};

export type EVMcl = {
  encode: (
    signer: Signer,
    options?: EVMcrisprOptions & ForwardOptions,
  ) => Promise<{
    actions: Action[];
    forward: () => Promise<providers.TransactionReceipt[]>;
  }>;
  forward: (
    signer: Signer,
    options?: EVMcrisprOptions & ForwardOptions,
  ) => Promise<providers.TransactionReceipt[]>;
  dao: string;
  path: string[];
  evmcrispr: (
    signer: Signer,
    options?: EVMcrisprOptions & ForwardOptions,
  ) => Promise<EVMcrispr>;
};

/**
 * A string that contains an Ethereum address.
 */
export type Address = string;

/** @internal */
export type AppArtifactCache = Map<Address, AppArtifact>;

/**
 * A map which contains the DAO's apps indexed by their identifier ([[AppIdentifier]] or [[LabeledAppIdentifier]]).
 */
export type AppCache = Map<AppIdentifier | LabeledAppIdentifier, App>;

/**
 * A string that follows the format `<AppName>[:<Index>]` (e.g. `vault:1`):
 *
 * - **AppName**: Name of the app as it appears in the APM excluding the ens registry name. For example: the
 * app name of `voting.aragonpm.eth` is `voting`.
 * - **Index**: A numeric value starting at 0 used when more than one app of the same type is installed. It
 * follows a chronological installation order (e.g. `app:0` was installed before `app:1`).
 * When the index is omitted, EVMcrispr assumes you're referencing the app with index zero.
 */
export type AppIdentifier = string;

/** @internal */
export interface ArtifactData {
  abiInterface: utils.Interface;
  roles: any[];
}

/**
 * An array which follows the format `[<Grantee>, <App>, <Role>, <Manager>]`
 *
 * - **Grantee**: Entity that will be able to perform the permission.
 * - **App**: App entity that holds the allowed permission.
 * - **Role**: The permission's name.
 * - **Params**: Function that returns an array of encoded ACL parameters.
 * - **Manager**: Entity that will act as the permission manager.
 */
export type CompletePermission = [Entity, Entity, string, Params, string];

/**
 * A string which can be a [[AppIdentifier]], [[LabeledAppIdentifier]] or [[Address]].
 */
export type Entity = AppIdentifier | LabeledAppIdentifier | Address;

/**
 * A string similar to [[AppIdentifier]] that follows the format `<AppName>:<Label>` (e.g. `vault:main-org-reserve`):
 *
 * - **AppName**: Same as the one defined on [[AppIdentifier]].
 * - **Label**: A non-numeric string that identifies a new installed app.
 */
export type LabeledAppIdentifier = string;

/**
 * The role's keccak256 hash.
 */
export type RoleHash = string;

/**
 * A function that returns an array of encoded ACL parameters.
 * It can be generated with the following ACL util functions, or a combination of them:
 * - arg(argId)[opId](value)
 * - blockNumber[opId](value)
 * - timestamp[opId](value)
 * - oracle(oracleAddr)
 * - not(param)
 * - and(param1, param2)
 * - or(param1, param2)
 * - xor(param1, param2)
 * - iff(param1).then(param2).else(param3)
 * - paramValue[opId](value)
 */
export type Params = (index?: number) => string[];

/**
 * An array which follows the format `[<Grantee>, <App>, <Role>]`.
 *
 * - **Grantee**: Entity that will be able to perform the permission.
 * - **App**: App entity that holds the allowed permission.
 * - **Role**: The permission's name.
 */
export type Permission = [Entity, Entity, string];

/**
 * A map which contains a set of [[Role]] indexed by their [[RoleHash]].
 */
export type PermissionMap = Map<RoleHash, Role>;

/**
 * An array which follows the format `[<Grantee>, <App>, <Role>, <Manager>]`
 *
 * - **Grantee**: Entity that will be able to perform the permission.
 * - **App**: App entity that holds the allowed permission.
 * - **Role**: The permission's name.
 * - **Params**: Function that returns an array of encoded ACL parameters.
 * - **Manager**: Entity that will act as the permission manager.
 */
export type PermissionP = [Entity, Entity, string, Params];

// ---------------------- INTERFACES ----------------------

/**
 * An object that represents an action in the DAO (e.g. installing a new app, minting tokens, etc).
 */
export interface Action {
  /**
   * The recipient address.
   */
  to: string;
  /**
   * The encoded action. It can be conceived of as contract function calls.
   */
  data: string;
  /**
   * The ether which needs to be sent along with the action (in wei).
   */
  value?: number;
}

/**
 * An object that contains app data.
 */
export interface App {
  /**
   * The app's contract ABI [Interface](https://docs.ethers.io/v5/api/utils/abi/interface/).
   */
  abiInterface: utils.Interface;
  /**
   * The app's address.
   */
  address: Address;
  /**
   * The app's base contract address.
   */
  codeAddress: Address;
  /**
   * The IPFS content identifier the app's data is located on.
   */
  contentUri: string;
  /**
   * The app's name.
   */
  name: string;
  /**
   * The app's permissions.
   */
  permissions: PermissionMap;
  /**
   * The app's aragonPM ens registry name.
   */
  registryName: string;
}

/**
 * The EVMcrispr optional configuration object.
 */
export interface EVMcrisprOptions {
  /**
   * An IPFS gateway url to fetch app data from.
   */
  ipfsGateway?: string;
  /*
   * An alternative ENS contract to resolve aragonid.eth and aragonpm.eth.
   */
  ensResolver?: string;
  /**
   * A custom subgraph url to connect to.
   */
  subgraphUrl?: string;

  helpers?: Helpers;
}

export interface ForwardOptions {
  /**
   * The context information describing the forward evmscript.
   * Needed for forwarders with context (AragonOS v5).
   */
  context?: string;
  gasPrice?: BigNumberish;
  gasLimit?: BigNumberish;
}

/**
 * An intermediate app object that contains raw properties
 * that still need to be formatted and processed.
 */
export interface ParsedApp {
  /**
   * The app's address.
   */
  address: Address;
  /**
   * The app's Aragon artifact.
   */
  artifact: AragonArtifact;
  /**
   * The app's id.
   */
  appId: string;
  /**
   * The app's base contract address.
   */
  codeAddress: string;
  /**
   * The IPFS content identifier the app's data is located on.
   */
  contentUri: string;
  /**
   * The app's name.
   */
  name: string;
  /**
   * The app's aragonPM ens registry name.
   */
  registryName: string;
  /**
   * The app's roles.
   */
  roles: {
    roleHash: string;
    manager: string;
    grantees: { granteeAddress: Address }[];
  }[];
}

/**
 * An object that contains the app's repo data.
 */
export interface Repo {
  /**
   * The repo's app artifact.
   */
  artifact: any;
  /**
   * The IPFS content identifier the repo's app data is located on.
   */
  contentUri: string;
  /**
   * The repo's app base contract address.
   */
  codeAddress: string;
}

/**
 * An object that contains an app's permission data.
 */
export interface Role {
  /**
   * The permission manager address.
   */
  manager?: Address;
  /**
   * The entities that are allowed to perform this permission.
   */
  grantees: Set<Address>;
}
