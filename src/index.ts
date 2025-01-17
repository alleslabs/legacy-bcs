import {
  BCS as mystenBcs,
  BcsWriter,
  BcsReader,
  fromHEX,
  toHEX,
  TypeName,
  StructTypeDefinition,
} from '@mysten/bcs';
import { AccAddress, BigNumber, num } from './core';
import { MoveFunctionABI } from './core/move/types';
import { Encoding } from '@mysten/bcs/dist/esm/types';

export class BCS {
  private static bcs: BCS;
  private mystenBcs: mystenBcs;
  private addressLength = 32;

  static readonly U8: string = 'u8';
  static readonly U16: string = 'u16';
  static readonly U32: string = 'u32';
  static readonly U64: string = 'u64';
  static readonly U128: string = 'u128';
  static readonly U256: string = 'u256';
  static readonly BOOL: string = 'bool';
  static readonly VECTOR: string = 'vector';
  static readonly ADDRESS: string = 'address';
  static readonly STRING: string = 'string';
  static readonly OPTION: string = 'option';
  static readonly OBJECT: string = 'object';
  static readonly FIXED_POINT32: string = 'fixed_point32';
  static readonly FIXED_POINT64: string = 'fixed_point64';
  static readonly DECIMAL128: string = 'decimal128';
  static readonly DECIMAL256: string = 'decimal256';

  private constructor() {
    this.mystenBcs = new mystenBcs({
      genericSeparators: ['<', '>'],
      vectorType: 'vector',
      addressLength: this.addressLength,
      addressEncoding: 'hex',
    });

    // Overwrite address with padStart
    this.mystenBcs.registerType(
      BCS.ADDRESS,
      (writer: BcsWriter, data: string) => {
        data = data.startsWith('init1') ? AccAddress.toHex(data) : data;
        const address = data
          .replace('0x', '')
          .padStart(this.addressLength * 2, '0');

        return fromHEX(address).reduce(
          (writer, el) => writer.write8(el),
          writer
        );
      },
      reader => {
        let rawString = toHEX(reader.readBytes(this.addressLength));
        for (let i = 0; i < rawString.length; i++) {
          if (rawString[i] !== '0') {
            rawString = rawString.substring(i);
            break;
          }
        }
        return `0x${rawString}`;
      }
    );

    // register Object { inner: address }
    this.mystenBcs.registerType(
      BCS.OBJECT,
      (writer: BcsWriter, data: string) => {
        data = data.startsWith('init1') ? AccAddress.toHex(data) : data;
        const address = data
          .replace('0x', '')
          .padStart(this.addressLength * 2, '0');

        return fromHEX(address).reduce(
          (writer, el) => writer.write8(el),
          writer
        );
      },
      reader => toHEX(reader.readBytes(this.addressLength))
    );

    // register FixedPoint32 { value: u64 }
    this.mystenBcs.registerType(
      BCS.FIXED_POINT32,
      (writer: BcsWriter, data: number | string) => {
        const n = num(data);
        const val = n.times(new BigNumber('4294967296'));
        return writer.write64(BigInt(val.toFixed(0, BigNumber.ROUND_DOWN)));
      },
      reader => {
        const val = num(reader.read64());
        return val.div(new BigNumber('4294967296')).toNumber();
      }
    );

    // register FixedPoint64 { value: u128 }
    this.mystenBcs.registerType(
      BCS.FIXED_POINT64,
      (writer: BcsWriter, data: number | string) => {
        const n = num(data);
        const val = n.times(new BigNumber('18446744073709551616'));
        return writer.write128(BigInt(val.toFixed(0, BigNumber.ROUND_DOWN)));
      },
      reader => {
        const val = num(reader.read128());
        return val.div(new BigNumber('18446744073709551616')).toNumber();
      }
    );

    // register Decimal128 { value: u128 }
    this.mystenBcs.registerType(
      BCS.DECIMAL128,
      (writer: BcsWriter, data: number | string) => {
        const n = num(data);
        const val = n.times(new BigNumber('1000000000000000000'));
        return writer.write128(BigInt(val.toFixed(0, BigNumber.ROUND_DOWN)));
      },
      reader => {
        const val = num(reader.read128());
        return val.div(new BigNumber('1000000000000000000')).toNumber();
      }
    );

    // register Decimal256 { value: u256 }
    this.mystenBcs.registerType(
      BCS.DECIMAL256,
      (writer: BcsWriter, data: number | string) => {
        const n = num(data);
        const val = n.times(new BigNumber('1000000000000000000'));
        return writer.write256(BigInt(val.toFixed(0, BigNumber.ROUND_DOWN)));
      },
      reader => {
        const val = num(reader.read256());
        return val.div(new BigNumber('1000000000000000000')).toNumber();
      }
    );

    // overwrite string
    this.mystenBcs.registerType(
      BCS.STRING,
      function (writer: BcsWriter, data: string) {
        return writer.writeVec(
          [...new TextEncoder().encode(data)],
          (writer, el) => writer.write8(el)
        );
      },
      function (reader: BcsReader) {
        return new TextDecoder().decode(
          Buffer.from(reader.readVec(reader => reader.read8()))
        );
      }
    );

    this.registerOptionType(BCS.OPTION);
  }

  public static getInstance() {
    if (!BCS.bcs) {
      BCS.bcs = new BCS();
    }

    return BCS.bcs;
  }

  /**
   * Serialize data to bcs.
   * Return base64 encoded string
   *
   * Preregistered types : `u8`, `u16`, `u32`, `u64`, `u128`, `u256`,
   *   `bool`, `vector`, `address`, `string`, `option`
   *
   * @example
   * const bcs = BCS.getInstance();
   *
   * const num = bcs.serialize(BCS.U64, 2187462); // numeric
   * const bool = bcs.serialize(BCS.BOOL, true); // bool
   * const vector = bcs.serialize('vector<u64>', [1, 2, 3, 4]); // vector
   * const string = bcs.serialize(BCS.STRING, 'initia'); // string
   * const optionSome = bcs.serialize('option<u64>', 18237); // option some
   * const optionNone = bcs.serialize('option<u64>', null); // option none
   *
   * @param type Name of the type of serialize
   * @param data Data to serialize
   * @param size Serialization buffer size. Default 1024 bytes
   * @return Base64 encoded of serialized data
   */
  public serialize(type: string, data: any, size = 1024): string {
    return this.mystenBcs.ser(type, data, { size }).toString('base64');
  }

  /**
   * Deserialize bcs.
   *
   * @example
   *
   * const bcs = BCS.getInstance();
   *
   * const num = bcs.serialize(BCS.U64, 2187462);
   * const deNum = bcs.deserialize(BCS.U64, 2187462);
   *
   * @param type Name of the type of deserialize
   * @param data  Data to deserialize
   * @param encoding Encoding to use if data is of type String. Default 'base64'
   * @returns
   */
  public deserialize<T>(
    type: string,
    data: Uint8Array | string,
    encoding = 'base64' as Encoding
  ): T {
    return this.mystenBcs.de(type, data, encoding) as T;
  }

  /**
   * Safe method to register a custom Move struct. The first argument is a name of the
   * struct which is only used on the FrontEnd and has no affect on serialization results,
   * and the second is a struct description passed as an Object.
   *
   * The description object MUST have the same order on all of the platforms (ie in Move
   * or in Rust).
   *
   * @example
   * // Move struct
   * // struct Data {
   * //   num: u64,
   * //   str: std::string::String,
   * //   vec: vector<bool>,
   * // }
   *
   * const bcs = BCS.getInstance();
   *
   * bcs.registerStruct('data', {
   *   num: BCS.U64,
   *   str: BCS.STRING,
   *   vec: 'vector<bool>'
   * });
   *
   * const data = {
   *   num: 1234,
   *   str: '1234',
   *   vec: [true, false, true],
   * };
   *
   * const ser = bcs.serialize('data', data);
   * const de = bcs.deserialize('data', ser);
   *
   * @param name Name of the type to register.
   * @param fields Fields of the struct. Must be in the correct order.
   */
  public registerStruct(name: string, fields: StructTypeDefinition) {
    this.mystenBcs.registerStructType(name, fields);
  }

  private registerOptionType(name: string, elementType?: string) {
    const { name: typeName, params: typeParams } =
      this.mystenBcs.parseTypeName(name);

    if (typeParams.length > 1) {
      throw new Error('Option can have only one type parameter; got ' + name);
    }

    return this.mystenBcs.registerType(
      typeName,
      (writer: BcsWriter, data: any, typeParams: TypeName[]) =>
        writer.writeVec(data === null ? [] : [data], (writer, el) => {
          const vectorType = elementType ?? typeParams[0];

          if (vectorType) {
            const { name: typeName, params: typeParams } =
              this.mystenBcs.parseTypeName(vectorType);
            return this.mystenBcs
              .getTypeInterface(elementType ?? typeName)
              ._encodeRaw(writer, el, typeParams, {});
          } else {
            throw new Error(
              `Incorrect number of type parameters passed to option '${typeName}'`
            );
          }
        }),
      (reader: BcsReader, typeParams) => {
        const vec = reader.readVec(reader => {
          const vectorType = elementType ?? typeParams[0];
          if (vectorType) {
            const { name: typeName, params: typeParams } =
              this.mystenBcs.parseTypeName(vectorType);
            return this.mystenBcs
              .getTypeInterface(elementType ?? typeName)
              ._decodeRaw(reader, typeParams, {});
          } else {
            throw new Error(
              `Incorrect number of type parameters passed to option '${typeName}'`
            );
          }
        });
        return vec[0] ? vec[0] : null;
      }
    );
  }
}

export function argsEncodeWithABI(args: any[], abi: MoveFunctionABI) {
  const bcs = BCS.getInstance();
  const paramTypes = abi.params
    .map(param => {
      param = param.replace('0x1::string::String', 'string');
      param = param.replace('0x1::option::Option', 'option');
      return param;
    })
    .filter(param => !/signer/.test(param));

  return args.map((value, index) => bcs.serialize(paramTypes[index], value));
}
