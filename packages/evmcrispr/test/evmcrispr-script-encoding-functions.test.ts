import type { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';

import type { Action, ActionFunction } from '../src';
import { EVMcrispr, ErrorInvalid, evmcl } from '../src';
import {
  APP,
  COMPLETE_FORWARDER_PATH,
  CONTEXT,
  DAO,
  FEE_AMOUNT,
  FEE_FORWARDER,
  FEE_TOKEN_ADDRESS,
  GRANT_PERMISSIONS,
  NEW_PERMISSIONS,
  PERMISSION_MANAGER,
  REVOKE_PERMISSIONS,
  getSignatureSelector,
  getSigner,
  resolveApp,
  resolvePermission,
} from './fixtures';
import { encodeActCall } from '../src/utils';
import {
  createTestAction,
  createTestPreTxAction,
  createTestScriptEncodedAction,
} from './test-helpers/actions';
import { expectThrowAsync, isValidIdentifier } from './test-helpers/expects';

describe('EVMcrispr script-encoding functions', () => {
  let evmcrispr: EVMcrispr;
  let signer: SignerWithAddress;
  let expectedActions: Action[];
  let actionFunctions: ActionFunction[];

  before(async () => {
    signer = await getSigner();

    evmcrispr = await EVMcrispr.create(DAO.kernel, signer);
  });

  before(() => {
    const { acl, kernel } = DAO;
    const {
      appId,
      appIdentifier,
      callSignature,
      callSignatureParams,
      codeAddress,
      initializeParams,
      initializeSignature,
    } = APP;
    const callSelector = getSignatureSelector(callSignature);

    const grantPermission = GRANT_PERMISSIONS[0];
    // Prepare test actions
    const installAction = createTestAction('newAppInstance', kernel, [
      appId,
      codeAddress,
      encodeActCall(initializeSignature, initializeParams),
      false,
    ]);
    const addPermissionAction = NEW_PERMISSIONS.map((p) =>
      createTestAction('createPermission', acl, [
        ...resolvePermission(p),
        resolveApp(PERMISSION_MANAGER),
      ]),
    );
    const grantPermissionAction = createTestAction(
      'grantPermission',
      acl,
      resolvePermission(grantPermission),
    );
    const revokeActions = REVOKE_PERMISSIONS.reduce(
      (actions: Action[], currentPermission) => {
        const resolvedPermission = resolvePermission(currentPermission);
        return [
          ...actions,
          createTestAction('revokePermission', acl, resolvedPermission),
          createTestAction(
            'removePermissionManager',
            acl,
            resolvedPermission.slice(1, 3),
          ),
        ];
      },
      [],
    );
    const callAppAction: Action = {
      to: resolveApp(appIdentifier),
      data: encodeActCall(callSignature, callSignatureParams),
    };
    expectedActions = [
      installAction,
      ...addPermissionAction,
      grantPermissionAction,
      ...revokeActions,
      callAppAction,
    ];

    // Prepare EVMcrispr action functions
    actionFunctions = [
      evmcrispr.install(`${appIdentifier}:new-app`, initializeParams),
      evmcrispr.grantPermissions(
        [...NEW_PERMISSIONS, grantPermission],
        PERMISSION_MANAGER,
      ),
      evmcrispr.revokePermissions(REVOKE_PERMISSIONS, true),
      evmcrispr.exec(appIdentifier, callSelector, callSignatureParams),
    ];
  });

  describe('encode()', () => {
    it('should fail when passing an empty group of actions', async () => {
      await expectThrowAsync(
        () => evmcrispr.encode([], COMPLETE_FORWARDER_PATH),
        { type: ErrorInvalid },
      );
    });

    it('should fail when passing an empty set of forwarders', async () => {
      await expectThrowAsync(() => evmcrispr.encode(actionFunctions, []), {
        type: ErrorInvalid,
      });
    });

    it(
      'should fail when passing an invalid set of forwarders',
      isValidIdentifier(
        (badIdentifier) => () =>
          evmcrispr.encode(actionFunctions, [badIdentifier]),
      ),
    );

    it('should fail when encoding a set of actions into an EVM script using a context forwarder and not receiving a context', async () => {
      const { appIdentifier, callSignature, callSignatureParams } = APP;
      const callSelector = getSignatureSelector(callSignature);

      await expectThrowAsync(
        () =>
          evmcrispr.encode(
            [evmcrispr.exec(appIdentifier, callSelector, callSignatureParams)],
            COMPLETE_FORWARDER_PATH,
          ),
        { type: ErrorInvalid },
      );
    });

    it('should encode a set of actions into an EVM script correctly using a path containing a fee, context and normal forwarder', async () => {
      const expectedEncodedTxActions = [
        createTestPreTxAction('approve', FEE_TOKEN_ADDRESS, [
          resolveApp(FEE_FORWARDER),
          FEE_AMOUNT,
        ]),
        createTestScriptEncodedAction(
          expectedActions,
          COMPLETE_FORWARDER_PATH,
          CONTEXT,
        ),
      ];
      const { actions: encodedScriptAction } = await evmcrispr.encode(
        actionFunctions,
        COMPLETE_FORWARDER_PATH,
        {
          context: CONTEXT,
        },
      );

      expect(encodedScriptAction, 'Transactions mismatch').eql(
        expectedEncodedTxActions,
      );
    });

    it('should encode an evmcl script', async () => {
      const { appIdentifier, callSignature, callSignatureParams } = APP;
      const callSelector = getSignatureSelector(callSignature);
      const expectedEncodedScriptAction = await evmcrispr.encode(
        [evmcrispr.exec(appIdentifier, callSelector, callSignatureParams)],
        COMPLETE_FORWARDER_PATH,
        { context: CONTEXT },
      );
      const encodedScriptAction = await evmcl`
          connect ${DAO.kernel} ${COMPLETE_FORWARDER_PATH.join(
        ' ',
      )} --context ${CONTEXT}
          exec ${appIdentifier} ${callSelector} ${callSignatureParams.join(' ')}
        `.encode(signer);

      expect(encodedScriptAction.actions, 'EVM script action mismatch').eql(
        expectedEncodedScriptAction.actions,
      );
    });
  });

  // xdescribe("forward()", () => {});
});
