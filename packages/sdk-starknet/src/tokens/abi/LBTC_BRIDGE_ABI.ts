export default [
  {
    name: 'AssetRouterImpl',
    type: 'impl',
    interface_name: 'lbtc_asset_router::interface::IAssetRouter',
  },
  {
    name: 'core::integer::u256',
    type: 'struct',
    members: [
      {
        name: 'low',
        type: 'core::integer::u128',
      },
      {
        name: 'high',
        type: 'core::integer::u128',
      },
    ],
  },
  {
    name: 'core::array::Span::<(core::integer::u256, core::integer::u256)>',
    type: 'struct',
    members: [
      {
        name: 'snapshot',
        type: '@core::array::Array::<(core::integer::u256, core::integer::u256)>',
      },
    ],
  },
  {
    name: 'core::byte_array::ByteArray',
    type: 'struct',
    members: [
      {
        name: 'data',
        type: 'core::array::Array::<core::bytes_31::bytes31>',
      },
      {
        name: 'pending_word',
        type: 'core::felt252',
      },
      {
        name: 'pending_word_len',
        type: 'core::integer::u32',
      },
    ],
  },
  {
    name: 'core::bool',
    type: 'enum',
    variants: [
      {
        name: 'False',
        type: '()',
      },
      {
        name: 'True',
        type: '()',
      },
    ],
  },
  {
    name: 'lbtc_asset_router::interface::IAssetRouter',
    type: 'interface',
    items: [
      {
        name: 'change_bascule',
        type: 'function',
        inputs: [
          {
            name: 'new_bascule',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'change_treasury',
        type: 'function',
        inputs: [
          {
            name: 'new_treasury',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'change_burn_commission',
        type: 'function',
        inputs: [
          {
            name: 'new_burn_commission',
            type: 'core::integer::u64',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'enable_withdrawals',
        type: 'function',
        inputs: [],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'disable_withdrawals',
        type: 'function',
        inputs: [],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'change_dust_fee_rate',
        type: 'function',
        inputs: [
          {
            name: 'new_rate',
            type: 'core::integer::u128',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'mint',
        type: 'function',
        inputs: [
          {
            name: 'to_chain',
            type: 'core::integer::u256',
          },
          {
            name: 'recipient',
            type: 'core::starknet::contract_address::ContractAddress',
          },
          {
            name: 'amount',
            type: 'core::integer::u256',
          },
          {
            name: 'tx_id',
            type: 'core::integer::u256',
          },
          {
            name: 'vout',
            type: 'core::integer::u32',
          },
          {
            name: 'proof',
            type: 'core::array::Span::<(core::integer::u256, core::integer::u256)>',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'redeem',
        type: 'function',
        inputs: [
          {
            name: 'script_pub_key',
            type: 'core::byte_array::ByteArray',
          },
          {
            name: 'amount',
            type: 'core::integer::u256',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'get_lbtc_token_address',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'get_bascule',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'get_consortium',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'get_treasury',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'get_burn_commission',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::integer::u64',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'calculate_unstake_request_amount',
        type: 'function',
        inputs: [
          {
            name: 'script_pub_key',
            type: 'core::byte_array::ByteArray',
          },
          {
            name: 'amount',
            type: 'core::integer::u256',
          },
        ],
        outputs: [
          {
            type: '(core::integer::u256, core::bool)',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'get_dust_fee_rate',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::integer::u128',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'is_payload_used',
        type: 'function',
        inputs: [
          {
            name: 'payload_hash',
            type: 'core::integer::u256',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'is_withdrawals_enabled',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'view',
      },
    ],
  },
  {
    name: 'RolesImpl',
    type: 'impl',
    interface_name: 'starkware_utils::components::roles::interface::IRoles',
  },
  {
    name: 'starkware_utils::components::roles::interface::IRoles',
    type: 'interface',
    items: [
      {
        name: 'is_app_governor',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'is_app_role_admin',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'is_governance_admin',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'is_operator',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'is_token_admin',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'is_upgrade_governor',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'is_security_admin',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'is_security_agent',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'register_app_governor',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'remove_app_governor',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'register_app_role_admin',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'remove_app_role_admin',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'register_governance_admin',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'remove_governance_admin',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'register_operator',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'remove_operator',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'register_token_admin',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'remove_token_admin',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'register_upgrade_governor',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'remove_upgrade_governor',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'renounce',
        type: 'function',
        inputs: [
          {
            name: 'role',
            type: 'core::felt252',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'register_security_admin',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'remove_security_admin',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'register_security_agent',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'remove_security_agent',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
    ],
  },
  {
    name: 'ReplaceabilityImpl',
    type: 'impl',
    interface_name:
      'starkware_utils::components::replaceability::interface::IReplaceable',
  },
  {
    name: 'core::array::Span::<core::felt252>',
    type: 'struct',
    members: [
      {
        name: 'snapshot',
        type: '@core::array::Array::<core::felt252>',
      },
    ],
  },
  {
    name: 'starkware_utils::components::replaceability::interface::EICData',
    type: 'struct',
    members: [
      {
        name: 'eic_hash',
        type: 'core::starknet::class_hash::ClassHash',
      },
      {
        name: 'eic_init_data',
        type: 'core::array::Span::<core::felt252>',
      },
    ],
  },
  {
    name: 'core::option::Option::<starkware_utils::components::replaceability::interface::EICData>',
    type: 'enum',
    variants: [
      {
        name: 'Some',
        type: 'starkware_utils::components::replaceability::interface::EICData',
      },
      {
        name: 'None',
        type: '()',
      },
    ],
  },
  {
    name: 'starkware_utils::components::replaceability::interface::ImplementationData',
    type: 'struct',
    members: [
      {
        name: 'impl_hash',
        type: 'core::starknet::class_hash::ClassHash',
      },
      {
        name: 'eic_data',
        type: 'core::option::Option::<starkware_utils::components::replaceability::interface::EICData>',
      },
      {
        name: 'final',
        type: 'core::bool',
      },
    ],
  },
  {
    name: 'starkware_utils::components::replaceability::interface::IReplaceable',
    type: 'interface',
    items: [
      {
        name: 'get_upgrade_delay',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::integer::u64',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'get_impl_activation_time',
        type: 'function',
        inputs: [
          {
            name: 'implementation_data',
            type: 'starkware_utils::components::replaceability::interface::ImplementationData',
          },
        ],
        outputs: [
          {
            type: 'core::integer::u64',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'add_new_implementation',
        type: 'function',
        inputs: [
          {
            name: 'implementation_data',
            type: 'starkware_utils::components::replaceability::interface::ImplementationData',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'remove_implementation',
        type: 'function',
        inputs: [
          {
            name: 'implementation_data',
            type: 'starkware_utils::components::replaceability::interface::ImplementationData',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'replace_to',
        type: 'function',
        inputs: [
          {
            name: 'implementation_data',
            type: 'starkware_utils::components::replaceability::interface::ImplementationData',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
    ],
  },
  {
    name: 'constructor',
    type: 'constructor',
    inputs: [
      {
        name: 'governance_admin',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        name: 'upgrade_delay',
        type: 'core::integer::u64',
      },
      {
        name: 'bascule',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        name: 'consortium',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        name: 'lbtc_token',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        name: 'treasury',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        name: 'burn_commission',
        type: 'core::integer::u64',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleGranted',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'role',
        type: 'core::felt252',
      },
      {
        kind: 'data',
        name: 'account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'sender',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleGrantedWithDelay',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'role',
        type: 'core::felt252',
      },
      {
        kind: 'data',
        name: 'account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'sender',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'delay',
        type: 'core::integer::u64',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleRevoked',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'role',
        type: 'core::felt252',
      },
      {
        kind: 'data',
        name: 'account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'sender',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleAdminChanged',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'role',
        type: 'core::felt252',
      },
      {
        kind: 'data',
        name: 'previous_admin_role',
        type: 'core::felt252',
      },
      {
        kind: 'data',
        name: 'new_admin_role',
        type: 'core::felt252',
      },
    ],
  },
  {
    kind: 'enum',
    name: 'openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::Event',
    type: 'event',
    variants: [
      {
        kind: 'nested',
        name: 'RoleGranted',
        type: 'openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleGranted',
      },
      {
        kind: 'nested',
        name: 'RoleGrantedWithDelay',
        type: 'openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleGrantedWithDelay',
      },
      {
        kind: 'nested',
        name: 'RoleRevoked',
        type: 'openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleRevoked',
      },
      {
        kind: 'nested',
        name: 'RoleAdminChanged',
        type: 'openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::RoleAdminChanged',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::AppGovernorAdded',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'added_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'added_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::AppGovernorRemoved',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'removed_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'removed_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::AppRoleAdminAdded',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'added_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'added_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::AppRoleAdminRemoved',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'removed_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'removed_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::GovernanceAdminAdded',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'added_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'added_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::GovernanceAdminRemoved',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'removed_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'removed_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::OperatorAdded',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'added_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'added_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::OperatorRemoved',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'removed_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'removed_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::SecurityAdminAdded',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'added_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'added_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::SecurityAdminRemoved',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'removed_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'removed_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::SecurityAgentAdded',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'added_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'added_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::SecurityAgentRemoved',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'removed_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'removed_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::TokenAdminAdded',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'added_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'added_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::TokenAdminRemoved',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'removed_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'removed_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::UpgradeGovernorAdded',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'added_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'added_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::roles::interface::UpgradeGovernorRemoved',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'removed_account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'removed_by',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'enum',
    name: 'starkware_utils::components::roles::roles::RolesComponent::Event',
    type: 'event',
    variants: [
      {
        kind: 'nested',
        name: 'AppGovernorAdded',
        type: 'starkware_utils::components::roles::interface::AppGovernorAdded',
      },
      {
        kind: 'nested',
        name: 'AppGovernorRemoved',
        type: 'starkware_utils::components::roles::interface::AppGovernorRemoved',
      },
      {
        kind: 'nested',
        name: 'AppRoleAdminAdded',
        type: 'starkware_utils::components::roles::interface::AppRoleAdminAdded',
      },
      {
        kind: 'nested',
        name: 'AppRoleAdminRemoved',
        type: 'starkware_utils::components::roles::interface::AppRoleAdminRemoved',
      },
      {
        kind: 'nested',
        name: 'GovernanceAdminAdded',
        type: 'starkware_utils::components::roles::interface::GovernanceAdminAdded',
      },
      {
        kind: 'nested',
        name: 'GovernanceAdminRemoved',
        type: 'starkware_utils::components::roles::interface::GovernanceAdminRemoved',
      },
      {
        kind: 'nested',
        name: 'OperatorAdded',
        type: 'starkware_utils::components::roles::interface::OperatorAdded',
      },
      {
        kind: 'nested',
        name: 'OperatorRemoved',
        type: 'starkware_utils::components::roles::interface::OperatorRemoved',
      },
      {
        kind: 'nested',
        name: 'SecurityAdminAdded',
        type: 'starkware_utils::components::roles::interface::SecurityAdminAdded',
      },
      {
        kind: 'nested',
        name: 'SecurityAdminRemoved',
        type: 'starkware_utils::components::roles::interface::SecurityAdminRemoved',
      },
      {
        kind: 'nested',
        name: 'SecurityAgentAdded',
        type: 'starkware_utils::components::roles::interface::SecurityAgentAdded',
      },
      {
        kind: 'nested',
        name: 'SecurityAgentRemoved',
        type: 'starkware_utils::components::roles::interface::SecurityAgentRemoved',
      },
      {
        kind: 'nested',
        name: 'TokenAdminAdded',
        type: 'starkware_utils::components::roles::interface::TokenAdminAdded',
      },
      {
        kind: 'nested',
        name: 'TokenAdminRemoved',
        type: 'starkware_utils::components::roles::interface::TokenAdminRemoved',
      },
      {
        kind: 'nested',
        name: 'UpgradeGovernorAdded',
        type: 'starkware_utils::components::roles::interface::UpgradeGovernorAdded',
      },
      {
        kind: 'nested',
        name: 'UpgradeGovernorRemoved',
        type: 'starkware_utils::components::roles::interface::UpgradeGovernorRemoved',
      },
    ],
  },
  {
    kind: 'enum',
    name: 'openzeppelin_introspection::src5::SRC5Component::Event',
    type: 'event',
    variants: [],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::replaceability::interface::ImplementationAdded',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'implementation_data',
        type: 'starkware_utils::components::replaceability::interface::ImplementationData',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::replaceability::interface::ImplementationRemoved',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'implementation_data',
        type: 'starkware_utils::components::replaceability::interface::ImplementationData',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::replaceability::interface::ImplementationReplaced',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'implementation_data',
        type: 'starkware_utils::components::replaceability::interface::ImplementationData',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::replaceability::interface::ImplementationFinalized',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'impl_hash',
        type: 'core::starknet::class_hash::ClassHash',
      },
    ],
  },
  {
    kind: 'enum',
    name: 'starkware_utils::components::replaceability::replaceability::ReplaceabilityComponent::Event',
    type: 'event',
    variants: [
      {
        kind: 'nested',
        name: 'ImplementationAdded',
        type: 'starkware_utils::components::replaceability::interface::ImplementationAdded',
      },
      {
        kind: 'nested',
        name: 'ImplementationRemoved',
        type: 'starkware_utils::components::replaceability::interface::ImplementationRemoved',
      },
      {
        kind: 'nested',
        name: 'ImplementationReplaced',
        type: 'starkware_utils::components::replaceability::interface::ImplementationReplaced',
      },
      {
        kind: 'nested',
        name: 'ImplementationFinalized',
        type: 'starkware_utils::components::replaceability::interface::ImplementationFinalized',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_asset_router::events::BasculeChanged',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'old_bascule',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'new_bascule',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_asset_router::events::ConsortiumChanged',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'old_consortium',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'new_consortium',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_asset_router::events::TreasuryChanged',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'old_treasury',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'new_treasury',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_asset_router::events::BurnCommissionChanged',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'old_burn_commission',
        type: 'core::integer::u64',
      },
      {
        kind: 'data',
        name: 'new_burn_commission',
        type: 'core::integer::u64',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_asset_router::events::WithdrawalsEnabled',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'is_withdrawals_enabled',
        type: 'core::bool',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_asset_router::events::UnstakeRequest',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'from_address',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'script_pub_key',
        type: 'core::byte_array::ByteArray',
      },
      {
        kind: 'data',
        name: 'amount_after_fee',
        type: 'core::integer::u256',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_asset_router::events::DustFeeRateChanged',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'old_rate',
        type: 'core::integer::u128',
      },
      {
        kind: 'data',
        name: 'new_rate',
        type: 'core::integer::u128',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_asset_router::events::MintProofConsumed',
    type: 'event',
    members: [
      {
        kind: 'key',
        name: 'recipient',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'key',
        name: 'payload_hash',
        type: 'core::integer::u256',
      },
      {
        kind: 'data',
        name: 'payload',
        type: 'core::byte_array::ByteArray',
      },
    ],
  },
  {
    kind: 'enum',
    name: 'lbtc_asset_router::asset_router::asset_router::Event',
    type: 'event',
    variants: [
      {
        kind: 'flat',
        name: 'AccessControlEvent',
        type: 'openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::Event',
      },
      {
        kind: 'flat',
        name: 'RolesEvent',
        type: 'starkware_utils::components::roles::roles::RolesComponent::Event',
      },
      {
        kind: 'flat',
        name: 'SRC5Event',
        type: 'openzeppelin_introspection::src5::SRC5Component::Event',
      },
      {
        kind: 'flat',
        name: 'ReplaceabilityEvent',
        type: 'starkware_utils::components::replaceability::replaceability::ReplaceabilityComponent::Event',
      },
      {
        kind: 'nested',
        name: 'BasculeChanged',
        type: 'lbtc_asset_router::events::BasculeChanged',
      },
      {
        kind: 'nested',
        name: 'ConsortiumChanged',
        type: 'lbtc_asset_router::events::ConsortiumChanged',
      },
      {
        kind: 'nested',
        name: 'TreasuryChanged',
        type: 'lbtc_asset_router::events::TreasuryChanged',
      },
      {
        kind: 'nested',
        name: 'BurnCommissionChanged',
        type: 'lbtc_asset_router::events::BurnCommissionChanged',
      },
      {
        kind: 'nested',
        name: 'WithdrawalsEnabled',
        type: 'lbtc_asset_router::events::WithdrawalsEnabled',
      },
      {
        kind: 'nested',
        name: 'UnstakeRequest',
        type: 'lbtc_asset_router::events::UnstakeRequest',
      },
      {
        kind: 'nested',
        name: 'DustFeeRateChanged',
        type: 'lbtc_asset_router::events::DustFeeRateChanged',
      },
      {
        kind: 'nested',
        name: 'MintProofConsumed',
        type: 'lbtc_asset_router::events::MintProofConsumed',
      },
    ],
  },
] as const;
