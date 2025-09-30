export default [
  {
    name: 'BasculeImpl',
    type: 'impl',
    interface_name: 'lbtc_bascule::interface::IBascule',
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
    name: 'core::array::Span::<core::integer::u256>',
    type: 'struct',
    members: [
      {
        name: 'snapshot',
        type: '@core::array::Array::<core::integer::u256>',
      },
    ],
  },
  {
    name: 'lbtc_bascule::interface::DepositState',
    type: 'enum',
    variants: [
      {
        name: 'Unreported',
        type: '()',
      },
      {
        name: 'Reported',
        type: '()',
      },
      {
        name: 'Withdrawn',
        type: '()',
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
    name: 'lbtc_bascule::interface::IBascule',
    type: 'interface',
    items: [
      {
        name: 'validate_withdrawal',
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
            name: 'withdrawal_amount',
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
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'update_validation_threshold',
        type: 'function',
        inputs: [
          {
            name: 'new_threshold',
            type: 'core::integer::u256',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'set_max_deposits',
        type: 'function',
        inputs: [
          {
            name: 'max_deposits',
            type: 'core::integer::u32',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'report_deposits',
        type: 'function',
        inputs: [
          {
            name: 'report_id',
            type: 'core::integer::u256',
          },
          {
            name: 'deposit_ids',
            type: 'core::array::Span::<core::integer::u256>',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'get_validation_threshold',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::integer::u256',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'get_max_deposits',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::integer::u32',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'get_deposit_status',
        type: 'function',
        inputs: [
          {
            name: 'deposit_id',
            type: 'core::integer::u256',
          },
        ],
        outputs: [
          {
            type: 'lbtc_bascule::interface::DepositState',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'is_deposit_reporter',
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
        name: 'register_deposit_reporter',
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
        name: 'remove_deposit_reporter',
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
        name: 'is_withdrawal_validator',
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
        name: 'register_withdrawal_validator',
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
        name: 'remove_withdrawal_validator',
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
        name: 'is_validation_guardian',
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
        name: 'register_validation_guardian',
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
        name: 'remove_validation_guardian',
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
        name: 'is_pauser',
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
        name: 'register_pauser',
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
        name: 'remove_pauser',
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
    name: 'PausableImpl',
    type: 'impl',
    interface_name:
      'starkware_utils::components::pausable::interface::IPausable',
  },
  {
    name: 'starkware_utils::components::pausable::interface::IPausable',
    type: 'interface',
    items: [
      {
        name: 'is_paused',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'pause',
        type: 'function',
        inputs: [],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'unpause',
        type: 'function',
        inputs: [],
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
        name: 'pauser',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        name: 'deposit_reporter',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        name: 'withdrawal_validator',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        name: 'max_deposits',
        type: 'core::integer::u32',
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
    name: 'openzeppelin_security::pausable::PausableComponent::Paused',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'openzeppelin_security::pausable::PausableComponent::Unpaused',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'account',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'enum',
    name: 'openzeppelin_security::pausable::PausableComponent::Event',
    type: 'event',
    variants: [
      {
        kind: 'nested',
        name: 'Paused',
        type: 'openzeppelin_security::pausable::PausableComponent::Paused',
      },
      {
        kind: 'nested',
        name: 'Unpaused',
        type: 'openzeppelin_security::pausable::PausableComponent::Unpaused',
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
    name: 'lbtc_bascule::events::DepositAlreadyReported',
    type: 'event',
    members: [
      {
        kind: 'key',
        name: 'deposit_id',
        type: 'core::integer::u256',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_bascule::events::DepositsReported',
    type: 'event',
    members: [
      {
        kind: 'key',
        name: 'report_id',
        type: 'core::integer::u256',
      },
      {
        kind: 'data',
        name: 'num_deposits',
        type: 'core::integer::u32',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_bascule::events::MaxDepositsUpdated',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'num_deposits',
        type: 'core::integer::u32',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_bascule::events::UpdateValidateThreshold',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'old_threshold',
        type: 'core::integer::u256',
      },
      {
        kind: 'data',
        name: 'new_threshold',
        type: 'core::integer::u256',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_bascule::events::WithdrawalNotValidated',
    type: 'event',
    members: [
      {
        kind: 'key',
        name: 'deposit_id',
        type: 'core::integer::u256',
      },
      {
        kind: 'data',
        name: 'withdrawal_amount',
        type: 'core::integer::u256',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'lbtc_bascule::events::WithdrawalValidated',
    type: 'event',
    members: [
      {
        kind: 'key',
        name: 'deposit_id',
        type: 'core::integer::u256',
      },
      {
        kind: 'data',
        name: 'withdrawal_amount',
        type: 'core::integer::u256',
      },
    ],
  },
  {
    kind: 'enum',
    name: 'lbtc_bascule::bascule::bascule::Event',
    type: 'event',
    variants: [
      {
        kind: 'flat',
        name: 'AccessControlEvent',
        type: 'openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::Event',
      },
      {
        kind: 'flat',
        name: 'PausableEvent',
        type: 'openzeppelin_security::pausable::PausableComponent::Event',
      },
      {
        kind: 'flat',
        name: 'SRC5Event',
        type: 'openzeppelin_introspection::src5::SRC5Component::Event',
      },
      {
        kind: 'nested',
        name: 'DepositAlreadyReported',
        type: 'lbtc_bascule::events::DepositAlreadyReported',
      },
      {
        kind: 'nested',
        name: 'DepositsReported',
        type: 'lbtc_bascule::events::DepositsReported',
      },
      {
        kind: 'nested',
        name: 'MaxDepositsUpdated',
        type: 'lbtc_bascule::events::MaxDepositsUpdated',
      },
      {
        kind: 'nested',
        name: 'UpdateValidateThreshold',
        type: 'lbtc_bascule::events::UpdateValidateThreshold',
      },
      {
        kind: 'nested',
        name: 'WithdrawalNotValidated',
        type: 'lbtc_bascule::events::WithdrawalNotValidated',
      },
      {
        kind: 'nested',
        name: 'WithdrawalValidated',
        type: 'lbtc_bascule::events::WithdrawalValidated',
      },
    ],
  },
] as const;
