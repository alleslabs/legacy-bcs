# Legacy BCS

Initia.js is a TypeScript-written JavaScript SDK tailored for the Initia blockchain, enhancing the development experience with user-friendly TypeScript definitions and integration with Initia's core data structures.

Forked from: https://github.com/initia-labs/initia.js/tree/v0.2.8

## Installation

Before installation, check the latest version of [npm](https://www.npmjs.com/package/@alleslabs/legacy-bcs):&#x20;

```bash
npm install @alleslabs/legacy-bcs
```

## Usage

The usage section of this document provides detailed explanations and code examples of the legacy BCS class.

### BCS

**BCS**(Binary Canonical Serialization) is the binary encoding for Move resources and other non-module values published on-chain. &#x20;

```typescript
import { BCS } from '@alleslabs/legacy-bcs';

const bcs = BCS.getInstance();

// serialize, serialize value to BCS and encode it to base64
const serializedU64 = bcs.serialize('u64' /*type*/, 1234 /*value*/);

// deserialize
const deserializedU64 = bcs.deserialize(
  'u64', //type
  serializedU64 // base64 encoded and BCS serialize value
);

// vector
const serializedVector = bcs.serialize('vector<u64>', [123, 456, 678]);

// option
const serializedSome = bcs.serialize('option<u64>', 123); // some
const serializedNone = bcs.serialize('option<u64>', null); // none
```

**Support types for BCS**

> \`u8\`, \`u16\`, \`u32\`, \`u64\`, \`u128\`, \`u256\`, \`bool\`, \`vector\`, \`address\`, \`string\`, \`option\`, \`object\`, \`fixed_point32\`, \`fixed_point64\`, \`decimal128\`, \`decimal256\`
