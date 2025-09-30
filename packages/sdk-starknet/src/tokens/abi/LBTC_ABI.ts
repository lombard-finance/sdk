export default [
  {
    name: 'MintableTokenImpl',
    type: 'impl',
    interface_name:
      'starkware_utils::interfaces::mintable_token::IMintableToken',
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
    name: 'starkware_utils::interfaces::mintable_token::IMintableToken',
    type: 'interface',
    items: [
      {
        name: 'permissioned_mint',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
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
        name: 'permissioned_burn',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
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
        name: 'is_permitted_minter',
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
    ],
  },
  {
    name: 'ERC20Impl',
    type: 'impl',
    interface_name: 'openzeppelin_token::erc20::interface::IERC20',
  },
  {
    name: 'openzeppelin_token::erc20::interface::IERC20',
    type: 'interface',
    items: [
      {
        name: 'total_supply',
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
        name: 'balance_of',
        type: 'function',
        inputs: [
          {
            name: 'account',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [
          {
            type: 'core::integer::u256',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'allowance',
        type: 'function',
        inputs: [
          {
            name: 'owner',
            type: 'core::starknet::contract_address::ContractAddress',
          },
          {
            name: 'spender',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [
          {
            type: 'core::integer::u256',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'transfer',
        type: 'function',
        inputs: [
          {
            name: 'recipient',
            type: 'core::starknet::contract_address::ContractAddress',
          },
          {
            name: 'amount',
            type: 'core::integer::u256',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'external',
      },
      {
        name: 'transfer_from',
        type: 'function',
        inputs: [
          {
            name: 'sender',
            type: 'core::starknet::contract_address::ContractAddress',
          },
          {
            name: 'recipient',
            type: 'core::starknet::contract_address::ContractAddress',
          },
          {
            name: 'amount',
            type: 'core::integer::u256',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
        state_mutability: 'external',
      },
      {
        name: 'approve',
        type: 'function',
        inputs: [
          {
            name: 'spender',
            type: 'core::starknet::contract_address::ContractAddress',
          },
          {
            name: 'amount',
            type: 'core::integer::u256',
          },
        ],
        outputs: [
          {
            type: 'core::bool',
          },
        ],
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
    name: 'ERC20MetadataImpl',
    type: 'impl',
    interface_name: 'openzeppelin_token::erc20::interface::IERC20Metadata',
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
    name: 'openzeppelin_token::erc20::interface::IERC20Metadata',
    type: 'interface',
    items: [
      {
        name: 'name',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::byte_array::ByteArray',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'symbol',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::byte_array::ByteArray',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'decimals',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::integer::u8',
          },
        ],
        state_mutability: 'view',
      },
    ],
  },
  {
    name: 'ERC20PermitImpl',
    type: 'impl',
    interface_name: 'openzeppelin_token::erc20::interface::IERC20Permit',
  },
  {
    name: 'openzeppelin_token::erc20::interface::IERC20Permit',
    type: 'interface',
    items: [
      {
        name: 'permit',
        type: 'function',
        inputs: [
          {
            name: 'owner',
            type: 'core::starknet::contract_address::ContractAddress',
          },
          {
            name: 'spender',
            type: 'core::starknet::contract_address::ContractAddress',
          },
          {
            name: 'amount',
            type: 'core::integer::u256',
          },
          {
            name: 'deadline',
            type: 'core::integer::u64',
          },
          {
            name: 'signature',
            type: 'core::array::Span::<core::felt252>',
          },
        ],
        outputs: [],
        state_mutability: 'external',
      },
      {
        name: 'nonces',
        type: 'function',
        inputs: [
          {
            name: 'owner',
            type: 'core::starknet::contract_address::ContractAddress',
          },
        ],
        outputs: [
          {
            type: 'core::felt252',
          },
        ],
        state_mutability: 'view',
      },
      {
        name: 'DOMAIN_SEPARATOR',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: 'core::felt252',
          },
        ],
        state_mutability: 'view',
      },
    ],
  },
  {
    name: 'SNIP12MetadataExternal',
    type: 'impl',
    interface_name:
      'openzeppelin_utils::cryptography::interface::ISNIP12Metadata',
  },
  {
    name: 'openzeppelin_utils::cryptography::interface::ISNIP12Metadata',
    type: 'interface',
    items: [
      {
        name: 'snip12_metadata',
        type: 'function',
        inputs: [],
        outputs: [
          {
            type: '(core::felt252, core::felt252)',
          },
        ],
        state_mutability: 'view',
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
    ],
  },
  {
    kind: 'struct',
    name: 'openzeppelin_token::erc20::erc20::ERC20Component::Transfer',
    type: 'event',
    members: [
      {
        kind: 'key',
        name: 'from',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'key',
        name: 'to',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'value',
        type: 'core::integer::u256',
      },
    ],
  },
  {
    kind: 'struct',
    name: 'openzeppelin_token::erc20::erc20::ERC20Component::Approval',
    type: 'event',
    members: [
      {
        kind: 'key',
        name: 'owner',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'key',
        name: 'spender',
        type: 'core::starknet::contract_address::ContractAddress',
      },
      {
        kind: 'data',
        name: 'value',
        type: 'core::integer::u256',
      },
    ],
  },
  {
    kind: 'enum',
    name: 'openzeppelin_token::erc20::erc20::ERC20Component::Event',
    type: 'event',
    variants: [
      {
        kind: 'nested',
        name: 'Transfer',
        type: 'openzeppelin_token::erc20::erc20::ERC20Component::Transfer',
      },
      {
        kind: 'nested',
        name: 'Approval',
        type: 'openzeppelin_token::erc20::erc20::ERC20Component::Approval',
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
    kind: 'enum',
    name: 'openzeppelin_utils::cryptography::nonces::NoncesComponent::Event',
    type: 'event',
    variants: [],
  },
  {
    kind: 'enum',
    name: 'openzeppelin_introspection::src5::SRC5Component::Event',
    type: 'event',
    variants: [],
  },
  {
    kind: 'struct',
    name: 'starkware_utils::components::pausable::pausable::PausableComponent::Paused',
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
    name: 'starkware_utils::components::pausable::pausable::PausableComponent::Unpaused',
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
    name: 'starkware_utils::components::pausable::pausable::PausableComponent::Event',
    type: 'event',
    variants: [
      {
        kind: 'nested',
        name: 'Paused',
        type: 'starkware_utils::components::pausable::pausable::PausableComponent::Paused',
      },
      {
        kind: 'nested',
        name: 'Unpaused',
        type: 'starkware_utils::components::pausable::pausable::PausableComponent::Unpaused',
      },
    ],
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
    kind: 'struct',
    name: 'lbtc_token::lbtc::events::MinterAdded',
    type: 'event',
    members: [
      {
        kind: 'data',
        name: 'minter',
        type: 'core::starknet::contract_address::ContractAddress',
      },
    ],
  },
  {
    kind: 'enum',
    name: 'lbtc_token::lbtc::token::lbtc::Event',
    type: 'event',
    variants: [
      {
        kind: 'flat',
        name: 'ERC20Event',
        type: 'openzeppelin_token::erc20::erc20::ERC20Component::Event',
      },
      {
        kind: 'flat',
        name: 'AccessControlEvent',
        type: 'openzeppelin_access::accesscontrol::accesscontrol::AccessControlComponent::Event',
      },
      {
        kind: 'flat',
        name: 'NoncesEvent',
        type: 'openzeppelin_utils::cryptography::nonces::NoncesComponent::Event',
      },
      {
        kind: 'flat',
        name: 'SRC5Event',
        type: 'openzeppelin_introspection::src5::SRC5Component::Event',
      },
      {
        kind: 'flat',
        name: 'PausableEvent',
        type: 'starkware_utils::components::pausable::pausable::PausableComponent::Event',
      },
      {
        kind: 'flat',
        name: 'ReplaceabilityEvent',
        type: 'starkware_utils::components::replaceability::replaceability::ReplaceabilityComponent::Event',
      },
      {
        kind: 'flat',
        name: 'RolesEvent',
        type: 'starkware_utils::components::roles::roles::RolesComponent::Event',
      },
      {
        kind: 'nested',
        name: 'MinterAdded',
        type: 'lbtc_token::lbtc::events::MinterAdded',
      },
    ],
  },
] as const;
