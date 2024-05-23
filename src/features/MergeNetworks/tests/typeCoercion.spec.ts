import { ValueTypeName } from "../../../models/TableModel";
import { getResonableCompatibleConvertionType, isConvertible, getPlainType } from "../utils/attributes-operations";

describe('Test type coercion functions', () => {
    it('should return true if the types are convertible', () => {
        expect(isConvertible(ValueTypeName.Integer, ValueTypeName.String)).toBe(true);
        expect(isConvertible(ValueTypeName.Integer, ValueTypeName.Long)).toBe(true);
        expect(isConvertible(ValueTypeName.Integer, ValueTypeName.Double)).toBe(true);
        expect(isConvertible(ValueTypeName.Long, ValueTypeName.Double)).toBe(true);
        expect(isConvertible(ValueTypeName.String, ValueTypeName.Integer)).toBe(false);
        expect(isConvertible(ValueTypeName.Boolean, ValueTypeName.Double)).toBe(false);
        expect(isConvertible(ValueTypeName.ListInteger, ValueTypeName.ListString)).toBe(true);
        expect(isConvertible(ValueTypeName.ListInteger, ValueTypeName.ListDouble)).toBe(true);
        expect(isConvertible(ValueTypeName.ListLong, ValueTypeName.ListDouble)).toBe(true);

    })
    it('should return the plain type', () => {
        expect(getPlainType(ValueTypeName.Integer)).toBe(ValueTypeName.Integer);
        expect(getPlainType(ValueTypeName.String)).toBe(ValueTypeName.String);
        expect(getPlainType(ValueTypeName.ListInteger)).toBe(ValueTypeName.Integer);
        expect(getPlainType(ValueTypeName.ListString)).toBe(ValueTypeName.String);
    })
    it('should return the reasonable compatible conversion type', () => {
        expect(getResonableCompatibleConvertionType(new Set([ValueTypeName.Integer, ValueTypeName.Long]))).toBe(ValueTypeName.Long);
        expect(getResonableCompatibleConvertionType(new Set([ValueTypeName.Integer, ValueTypeName.Double]))).toBe(ValueTypeName.Double);
        expect(getResonableCompatibleConvertionType(new Set([ValueTypeName.Integer, ValueTypeName.String]))).toBe(ValueTypeName.String);
        expect(getResonableCompatibleConvertionType(new Set([ValueTypeName.ListInteger, ValueTypeName.ListLong]))).toBe(ValueTypeName.ListLong);
        expect(getResonableCompatibleConvertionType(new Set([ValueTypeName.ListInteger, ValueTypeName.ListString]))).toBe(ValueTypeName.ListString);
        expect(getResonableCompatibleConvertionType(new Set([ValueTypeName.Boolean, ValueTypeName.Double]))).toBe(ValueTypeName.String);
        expect(getResonableCompatibleConvertionType(new Set([ValueTypeName.ListBoolean, ValueTypeName.ListDouble]))).toBe(ValueTypeName.ListString);

    })

});