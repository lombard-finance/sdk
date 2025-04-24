/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/lbtc.json`.
 */
export type Lbtc = {
  address: string;
  metadata: {
    name: 'lbtc';
    version: '0.1.0';
    spec: '0.1.0';
    description: 'Created with Anchor';
  };
  instructions: [
    {
      name: 'addClaimer';
      discriminator: [33, 50, 122, 167, 214, 239, 123, 116];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [
        {
          name: 'claimer';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'addMinter';
      discriminator: [75, 86, 218, 40, 219, 6, 141, 29];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [
        {
          name: 'minter';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'addPauser';
      discriminator: [164, 101, 59, 65, 139, 178, 135, 187];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [
        {
          name: 'pauser';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'burn';
      discriminator: [116, 110, 29, 56, 107, 219, 42, 93];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
        },
        {
          name: 'tokenProgram';
        },
        {
          name: 'recipient';
          writable: true;
        },
        {
          name: 'mint';
          writable: true;
        },
      ];
      args: [
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'createMetadataForValsetPayload';
      discriminator: [189, 101, 231, 21, 186, 160, 249, 252];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'metadata';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'hash';
              },
              {
                kind: 'const';
                value: [
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                ];
              },
              {
                kind: 'account';
                path: 'payer';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'hash';
          type: {
            array: ['u8', 32];
          };
        },
      ];
    },
    {
      name: 'createMintPayload';
      discriminator: [205, 40, 45, 244, 160, 237, 72, 219];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'config';
        },
        {
          name: 'payload';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'mintPayloadHash';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'mintPayloadHash';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'mintPayload';
          type: {
            array: ['u8', 164];
          };
        },
      ];
    },
    {
      name: 'createValsetPayload';
      discriminator: [231, 207, 246, 127, 211, 38, 71, 1];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'config';
        },
        {
          name: 'metadata';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'hash';
              },
              {
                kind: 'const';
                value: [
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                ];
              },
              {
                kind: 'account';
                path: 'payer';
              },
            ];
          };
        },
        {
          name: 'payload';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'hash';
              },
              {
                kind: 'account';
                path: 'payer';
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'hash';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'epoch';
          type: 'u64';
        },
        {
          name: 'weightThreshold';
          type: 'u64';
        },
        {
          name: 'height';
          type: 'u64';
        },
      ];
    },
    {
      name: 'disableBascule';
      discriminator: [57, 164, 60, 76, 249, 175, 240, 28];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'disableWithdrawals';
      discriminator: [150, 136, 206, 120, 173, 230, 137, 209];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'enableBascule';
      discriminator: [42, 184, 103, 55, 45, 231, 145, 180];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'enableWithdrawals';
      discriminator: [97, 146, 76, 161, 177, 54, 109, 83];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'initialize';
      discriminator: [175, 175, 109, 31, 13, 152, 155, 237];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'config';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [108, 98, 116, 99, 95, 99, 111, 110, 102, 105, 103];
              },
            ];
          };
        },
        {
          name: 'systemProgram';
          address: '11111111111111111111111111111111';
        },
      ];
      args: [
        {
          name: 'admin';
          type: 'pubkey';
        },
        {
          name: 'mint';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'mint';
      discriminator: [51, 57, 225, 47, 182, 146, 137, 166];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
        },
        {
          name: 'tokenProgram';
        },
        {
          name: 'recipient';
          writable: true;
        },
        {
          name: 'mint';
          writable: true;
        },
        {
          name: 'tokenAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
      ];
      args: [
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'mintFromPayload';
      discriminator: [78, 44, 95, 232, 161, 7, 56, 178];
      accounts: [
        {
          name: 'config';
        },
        {
          name: 'tokenProgram';
        },
        {
          name: 'recipient';
          writable: true;
        },
        {
          name: 'mint';
          writable: true;
        },
        {
          name: 'tokenAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'payload';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'mintPayloadHash';
              },
            ];
          };
        },
        {
          name: 'bascule';
          docs: ['here.'];
        },
      ];
      args: [
        {
          name: 'mintPayloadHash';
          type: {
            array: ['u8', 32];
          };
        },
      ];
    },
    {
      name: 'mintWithFee';
      discriminator: [142, 93, 70, 12, 187, 19, 19, 154];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
        },
        {
          name: 'tokenProgram';
        },
        {
          name: 'recipientAuth';
        },
        {
          name: 'recipient';
          writable: true;
        },
        {
          name: 'mint';
          writable: true;
        },
        {
          name: 'tokenAuthority';
          pda: {
            seeds: [
              {
                kind: 'const';
                value: [
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  117,
                  116,
                  104,
                  111,
                  114,
                  105,
                  116,
                  121,
                ];
              },
            ];
          };
        },
        {
          name: 'treasury';
          writable: true;
        },
        {
          name: 'payload';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'mintPayloadHash';
              },
            ];
          };
        },
        {
          name: 'bascule';
          docs: ['here.'];
        },
      ];
      args: [
        {
          name: 'mintPayloadHash';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'feePayload';
          type: {
            array: ['u8', 132];
          };
        },
        {
          name: 'feeSignature';
          type: {
            array: ['u8', 64];
          };
        },
      ];
    },
    {
      name: 'pause';
      discriminator: [211, 22, 221, 251, 74, 121, 193, 47];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [];
    },
    {
      name: 'postMetadataForValsetPayload';
      discriminator: [200, 60, 18, 229, 92, 163, 148, 119];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'metadata';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'hash';
              },
              {
                kind: 'const';
                value: [
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                ];
              },
              {
                kind: 'account';
                path: 'payer';
              },
            ];
          };
        },
      ];
      args: [
        {
          name: 'hash';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'validators';
          type: {
            vec: {
              array: ['u8', 64];
            };
          };
        },
        {
          name: 'weights';
          type: {
            vec: 'u64';
          };
        },
      ];
    },
    {
      name: 'postMintSignatures';
      discriminator: [224, 223, 208, 229, 215, 98, 206, 244];
      accounts: [
        {
          name: 'config';
        },
        {
          name: 'payload';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'mintPayloadHash';
              },
            ];
          };
        },
      ];
      args: [
        {
          name: 'mintPayloadHash';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'signatures';
          type: {
            vec: {
              array: ['u8', 64];
            };
          };
        },
        {
          name: 'indices';
          type: {
            vec: 'u64';
          };
        },
      ];
    },
    {
      name: 'postValsetSignatures';
      discriminator: [227, 35, 134, 32, 134, 86, 93, 76];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
        },
        {
          name: 'payload';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'hash';
              },
              {
                kind: 'account';
                path: 'payer';
              },
            ];
          };
        },
      ];
      args: [
        {
          name: 'hash';
          type: {
            array: ['u8', 32];
          };
        },
        {
          name: 'signatures';
          type: {
            vec: {
              array: ['u8', 64];
            };
          };
        },
        {
          name: 'indices';
          type: {
            vec: 'u64';
          };
        },
      ];
    },
    {
      name: 'redeem';
      discriminator: [184, 12, 86, 149, 70, 196, 97, 225];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'holder';
          writable: true;
        },
        {
          name: 'config';
        },
        {
          name: 'tokenProgram';
        },
        {
          name: 'mint';
          writable: true;
        },
        {
          name: 'treasury';
          writable: true;
        },
      ];
      args: [
        {
          name: 'scriptPubkey';
          type: 'bytes';
        },
        {
          name: 'amount';
          type: 'u64';
        },
      ];
    },
    {
      name: 'removeClaimer';
      discriminator: [152, 9, 18, 115, 56, 228, 139, 144];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [
        {
          name: 'claimer';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'removeMinter';
      discriminator: [241, 69, 84, 16, 164, 232, 131, 79];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [
        {
          name: 'minter';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'removePauser';
      discriminator: [251, 114, 202, 18, 216, 118, 176, 86];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [
        {
          name: 'pauser';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'setBurnCommission';
      discriminator: [222, 166, 1, 25, 113, 177, 18, 103];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [
        {
          name: 'commission';
          type: 'u64';
        },
      ];
    },
    {
      name: 'setDustFeeRate';
      discriminator: [85, 132, 15, 39, 176, 199, 66, 119];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [
        {
          name: 'rate';
          type: 'u64';
        },
      ];
    },
    {
      name: 'setInitialValset';
      discriminator: [171, 69, 132, 141, 206, 84, 175, 115];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
        {
          name: 'metadata';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'hash';
              },
              {
                kind: 'const';
                value: [
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                ];
              },
              {
                kind: 'account';
                path: 'payer';
              },
            ];
          };
        },
        {
          name: 'payload';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'hash';
              },
              {
                kind: 'account';
                path: 'payer';
              },
            ];
          };
        },
      ];
      args: [
        {
          name: 'hash';
          type: {
            array: ['u8', 32];
          };
        },
      ];
    },
    {
      name: 'setMintFee';
      discriminator: [52, 77, 178, 201, 245, 51, 250, 139];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [
        {
          name: 'mintFee';
          type: 'u64';
        },
      ];
    },
    {
      name: 'setNextValset';
      discriminator: [254, 186, 52, 223, 48, 163, 138, 51];
      accounts: [
        {
          name: 'payer';
          writable: true;
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
        {
          name: 'metadata';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'hash';
              },
              {
                kind: 'const';
                value: [
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                  1,
                ];
              },
              {
                kind: 'account';
                path: 'payer';
              },
            ];
          };
        },
        {
          name: 'payload';
          writable: true;
          pda: {
            seeds: [
              {
                kind: 'arg';
                path: 'hash';
              },
              {
                kind: 'account';
                path: 'payer';
              },
            ];
          };
        },
      ];
      args: [
        {
          name: 'hash';
          type: {
            array: ['u8', 32];
          };
        },
      ];
    },
    {
      name: 'setOperator';
      discriminator: [238, 153, 101, 169, 243, 131, 36, 1];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [
        {
          name: 'operator';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'setTreasury';
      discriminator: [57, 97, 196, 95, 195, 206, 106, 136];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [
        {
          name: 'treasury';
          type: 'pubkey';
        },
      ];
    },
    {
      name: 'unpause';
      discriminator: [169, 144, 4, 38, 10, 141, 188, 255];
      accounts: [
        {
          name: 'payer';
          signer: true;
        },
        {
          name: 'config';
          writable: true;
        },
      ];
      args: [];
    },
  ];
  accounts: [
    {
      name: 'config';
      discriminator: [155, 12, 170, 224, 30, 250, 204, 130];
    },
    {
      name: 'metadata';
      discriminator: [72, 11, 121, 26, 111, 181, 85, 93];
    },
    {
      name: 'mintPayload';
      discriminator: [182, 176, 206, 189, 220, 224, 214, 49];
    },
    {
      name: 'valsetPayload';
      discriminator: [109, 13, 39, 81, 55, 143, 90, 72];
    },
  ];
  events: [
    {
      name: 'basculeAddressChanged';
      discriminator: [249, 106, 145, 193, 71, 149, 228, 175];
    },
    {
      name: 'basculeEnabled';
      discriminator: [84, 223, 73, 187, 19, 208, 205, 93];
    },
    {
      name: 'burnCommissionSet';
      discriminator: [18, 131, 170, 12, 202, 225, 50, 38];
    },
    {
      name: 'chainIdSet';
      discriminator: [167, 174, 202, 146, 172, 177, 195, 142];
    },
    {
      name: 'claimerAdded';
      discriminator: [150, 253, 36, 31, 52, 150, 16, 21];
    },
    {
      name: 'claimerRemoved';
      discriminator: [141, 26, 147, 25, 89, 23, 74, 210];
    },
    {
      name: 'depositBtcActionSet';
      discriminator: [57, 22, 13, 98, 68, 47, 243, 131];
    },
    {
      name: 'dustFeeRateSet';
      discriminator: [156, 255, 129, 11, 222, 55, 84, 248];
    },
    {
      name: 'feeActionSet';
      discriminator: [243, 134, 143, 26, 136, 137, 224, 145];
    },
    {
      name: 'mintFeeSet';
      discriminator: [19, 160, 65, 66, 12, 237, 135, 42];
    },
    {
      name: 'mintPayloadPosted';
      discriminator: [252, 192, 166, 176, 58, 104, 196, 152];
    },
    {
      name: 'mintProofConsumed';
      discriminator: [39, 6, 40, 221, 150, 118, 32, 59];
    },
    {
      name: 'minterAdded';
      discriminator: [140, 185, 72, 194, 3, 99, 122, 172];
    },
    {
      name: 'minterRemoved';
      discriminator: [157, 21, 47, 29, 4, 195, 30, 77];
    },
    {
      name: 'operatorSet';
      discriminator: [187, 242, 164, 221, 208, 246, 180, 178];
    },
    {
      name: 'pauseEnabled';
      discriminator: [4, 110, 17, 57, 220, 234, 137, 77];
    },
    {
      name: 'pauserAdded';
      discriminator: [231, 206, 109, 54, 239, 205, 234, 248];
    },
    {
      name: 'pauserRemoved';
      discriminator: [224, 157, 132, 185, 123, 96, 72, 220];
    },
    {
      name: 'signaturesAdded';
      discriminator: [100, 152, 145, 89, 36, 109, 28, 103];
    },
    {
      name: 'treasuryChanged';
      discriminator: [252, 2, 55, 56, 106, 205, 227, 47];
    },
    {
      name: 'unstakeRequest';
      discriminator: [68, 183, 44, 101, 202, 120, 161, 227];
    },
    {
      name: 'validatorSetUpdated';
      discriminator: [234, 43, 30, 48, 204, 242, 119, 118];
    },
    {
      name: 'valsetActionSet';
      discriminator: [131, 103, 84, 207, 63, 99, 230, 112];
    },
    {
      name: 'valsetMetadataCreated';
      discriminator: [180, 48, 84, 47, 191, 69, 1, 228];
    },
    {
      name: 'valsetMetadataPosted';
      discriminator: [128, 155, 30, 200, 28, 163, 50, 72];
    },
    {
      name: 'valsetPayloadCreated';
      discriminator: [129, 29, 121, 180, 138, 90, 247, 6];
    },
    {
      name: 'withdrawalsEnabled';
      discriminator: [248, 142, 36, 143, 24, 105, 24, 86];
    },
  ];
  errors: [
    {
      code: 6000;
      name: 'unauthorized';
      msg: 'Unauthorized function call';
    },
    {
      code: 6001;
      name: 'recipientMismatch';
      msg: 'Mismatch between mint payload and passed account';
    },
    {
      code: 6002;
      name: 'invalidTreasury';
      msg: 'Invalid treasury provided for redeem';
    },
    {
      code: 6003;
      name: 'mintPayloadUsed';
      msg: 'Mint payload already used';
    },
    {
      code: 6004;
      name: 'mintPayloadHashMismatch';
      msg: 'Passed mint payload hash does not match computed hash';
    },
    {
      code: 6005;
      name: 'valsetPayloadHashMismatch';
      msg: 'Passed valset payload hash does not match computed hash';
    },
    {
      code: 6006;
      name: 'withdrawalsDisabled';
      msg: 'Withdrawals are disabled';
    },
    {
      code: 6007;
      name: 'feeGteAmount';
      msg: 'Fee is greater than or equal to amount';
    },
    {
      code: 6008;
      name: 'feeApprovalExpired';
      msg: 'Fee approval expired';
    },
    {
      code: 6009;
      name: 'signatureLengthMismatch';
      msg: 'Signatures array length mismatch with validators array';
    },
    {
      code: 6010;
      name: 'unsupportedRedeemAddress';
      msg: 'Script pubkey is unsupported';
    },
    {
      code: 6011;
      name: 'amountBelowDustLimit';
      msg: 'Redeemed amount is below the BTC dust limit';
    },
    {
      code: 6012;
      name: 'notEnoughSignatures';
      msg: 'Not enough valid signatures';
    },
    {
      code: 6013;
      name: 'invalidFeeSignature';
      msg: 'Fee signature invalid';
    },
    {
      code: 6014;
      name: 'secp256k1RecoverError';
      msg: 'Error when attempting to recover Secp256k1 public key';
    },
    {
      code: 6015;
      name: 'invalidActionBytes';
      msg: 'Invalid action bytes';
    },
    {
      code: 6016;
      name: 'invalidChainId';
      msg: 'Invalid chain ID';
    },
    {
      code: 6017;
      name: 'u64TooLarge';
      msg: 'Attempted to decode a u64, but leftover too large';
    },
    {
      code: 6018;
      name: 'u32TooLarge';
      msg: 'Attempted to decode a u32, but leftover too large';
    },
    {
      code: 6019;
      name: 'couldNotConvertToU64';
      msg: 'Could not convert amount bytes to u64';
    },
    {
      code: 6020;
      name: 'couldNotConvertToU32';
      msg: 'Could not convert vout bytes to u32';
    },
    {
      code: 6021;
      name: 'leftoverData';
      msg: 'Leftover data in payload';
    },
    {
      code: 6022;
      name: 'validatorSetAlreadySet';
      msg: 'Validator set already set';
    },
    {
      code: 6023;
      name: 'invalidEpoch';
      msg: 'Invalid epoch';
    },
    {
      code: 6024;
      name: 'noValidatorSet';
      msg: 'No validator set exists';
    },
    {
      code: 6025;
      name: 'invalidValidatorSetSize';
      msg: 'Invalid validator set size';
    },
    {
      code: 6026;
      name: 'invalidWeightThreshold';
      msg: 'Invalid weight threshold';
    },
    {
      code: 6027;
      name: 'validatorsAndWeightsMismatch';
      msg: 'Mismatch between validators length and weights length';
    },
    {
      code: 6028;
      name: 'zeroWeight';
      msg: 'Weight for validator is zero';
    },
    {
      code: 6029;
      name: 'weightsBelowThreshold';
      msg: 'Sum of weights is below the threshold';
    },
    {
      code: 6030;
      name: 'paused';
      msg: 'LBTC contract is paused';
    },
    {
      code: 6031;
      name: 'notPaused';
      msg: 'LBTC contract is not paused';
    },
    {
      code: 6032;
      name: 'invalidVerifyingcontract';
      msg: 'Invalid verifying contract';
    },
    {
      code: 6033;
      name: 'signaturesIndicesMismatch';
      msg: 'Mismatch between signatures and indices length';
    },
  ];
  types: [
    {
      name: 'basculeAddressChanged';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'address';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'basculeEnabled';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'enabled';
            type: 'bool';
          },
        ];
      };
    },
    {
      name: 'burnCommissionSet';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'burnCommission';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'chainIdSet';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'chainId';
            type: {
              array: ['u8', 32];
            };
          },
        ];
      };
    },
    {
      name: 'claimerAdded';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'claimer';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'claimerRemoved';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'claimer';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'config';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'admin';
            type: 'pubkey';
          },
          {
            name: 'operator';
            type: 'pubkey';
          },
          {
            name: 'treasury';
            type: 'pubkey';
          },
          {
            name: 'minters';
            type: {
              vec: 'pubkey';
            };
          },
          {
            name: 'claimers';
            type: {
              vec: 'pubkey';
            };
          },
          {
            name: 'pausers';
            type: {
              vec: 'pubkey';
            };
          },
          {
            name: 'mint';
            type: 'pubkey';
          },
          {
            name: 'burnCommission';
            type: 'u64';
          },
          {
            name: 'withdrawalsEnabled';
            type: 'bool';
          },
          {
            name: 'dustFeeRate';
            type: 'u64';
          },
          {
            name: 'basculeEnabled';
            type: 'bool';
          },
          {
            name: 'paused';
            type: 'bool';
          },
          {
            name: 'mintFee';
            type: 'u64';
          },
          {
            name: 'epoch';
            type: 'u64';
          },
          {
            name: 'validators';
            type: {
              vec: {
                array: ['u8', 64];
              };
            };
          },
          {
            name: 'weights';
            type: {
              vec: 'u64';
            };
          },
          {
            name: 'weightThreshold';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'depositBtcActionSet';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'action';
            type: 'u32';
          },
        ];
      };
    },
    {
      name: 'dustFeeRateSet';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'rate';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'feeActionSet';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'action';
            type: 'u32';
          },
        ];
      };
    },
    {
      name: 'metadata';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'validators';
            type: {
              vec: {
                array: ['u8', 64];
              };
            };
          },
          {
            name: 'weights';
            type: {
              vec: 'u64';
            };
          },
        ];
      };
    },
    {
      name: 'mintFeeSet';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'mintFee';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'mintPayload';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'epoch';
            type: 'u64';
          },
          {
            name: 'payload';
            type: {
              array: ['u8', 164];
            };
          },
          {
            name: 'signed';
            type: {
              vec: 'bool';
            };
          },
          {
            name: 'weight';
            type: 'u64';
          },
          {
            name: 'minted';
            type: 'bool';
          },
        ];
      };
    },
    {
      name: 'mintPayloadPosted';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'hash';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'payload';
            type: {
              array: ['u8', 164];
            };
          },
        ];
      };
    },
    {
      name: 'mintProofConsumed';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'recipient';
            type: 'pubkey';
          },
          {
            name: 'payloadHash';
            type: {
              array: ['u8', 32];
            };
          },
        ];
      };
    },
    {
      name: 'minterAdded';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'minter';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'minterRemoved';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'minter';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'operatorSet';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'operator';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'pauseEnabled';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'enabled';
            type: 'bool';
          },
        ];
      };
    },
    {
      name: 'pauserAdded';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pauser';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'pauserRemoved';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'pauser';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'signaturesAdded';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'hash';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'signatures';
            type: {
              vec: {
                array: ['u8', 64];
              };
            };
          },
        ];
      };
    },
    {
      name: 'treasuryChanged';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'address';
            type: 'pubkey';
          },
        ];
      };
    },
    {
      name: 'unstakeRequest';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'from';
            type: 'pubkey';
          },
          {
            name: 'scriptPubkey';
            type: 'bytes';
          },
          {
            name: 'amount';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'validatorSetUpdated';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'epoch';
            type: 'u64';
          },
          {
            name: 'validators';
            type: {
              vec: {
                array: ['u8', 64];
              };
            };
          },
          {
            name: 'weights';
            type: {
              vec: 'u64';
            };
          },
          {
            name: 'weightThreshold';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'valsetActionSet';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'action';
            type: 'u32';
          },
        ];
      };
    },
    {
      name: 'valsetMetadataCreated';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'hash';
            type: {
              array: ['u8', 32];
            };
          },
        ];
      };
    },
    {
      name: 'valsetMetadataPosted';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'hash';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'validators';
            type: {
              vec: {
                array: ['u8', 64];
              };
            };
          },
          {
            name: 'weights';
            type: {
              vec: 'u64';
            };
          },
        ];
      };
    },
    {
      name: 'valsetPayload';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'epoch';
            type: 'u64';
          },
          {
            name: 'weightThreshold';
            type: 'u64';
          },
          {
            name: 'signed';
            type: {
              vec: 'bool';
            };
          },
          {
            name: 'weight';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'valsetPayloadCreated';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'hash';
            type: {
              array: ['u8', 32];
            };
          },
          {
            name: 'epoch';
            type: 'u64';
          },
          {
            name: 'weightThreshold';
            type: 'u64';
          },
          {
            name: 'height';
            type: 'u64';
          },
        ];
      };
    },
    {
      name: 'withdrawalsEnabled';
      type: {
        kind: 'struct';
        fields: [
          {
            name: 'enabled';
            type: 'bool';
          },
        ];
      };
    },
  ];
};
