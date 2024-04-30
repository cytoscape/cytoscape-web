type CastFunction<T> = (from: any) => T;

class CastService<T> {
    private castFunc: CastFunction<T>;

    constructor(castFunc: CastFunction<T>) {
        this.castFunc = castFunc;
    }

    cast(from: any): T {
        return this.castFunc(from);
    }
}

export class ColumnType<T> {
    public static STRING = new ColumnType<string>("String", from => from.toString());
    public static INTEGER = new ColumnType<number>("Integer", from => parseInt(from.toString()));
    public static LONG = new ColumnType<number>("Long", from => parseInt(from.toString()));
    public static DOUBLE = new ColumnType<number>("Double", from => parseFloat(from.toString()));
    public static BOOLEAN = new ColumnType<boolean>("Boolean", from => Boolean(from.toString()));
    public static LIST_STRING = new ColumnType<string[]>("List<String>", undefined, true);
    public static LIST_INTEGER = new ColumnType<number[]>("List<Integer>", undefined, true);
    public static LIST_LONG = new ColumnType<number[]>("List<Long>", undefined, true);
    public static LIST_DOUBLE = new ColumnType<number[]>("List<Double>", undefined, true);
    public static LIST_BOOLEAN = new ColumnType<boolean[]>("List<Boolean>", undefined, true);

    private static plainTypes = new Map<any, ColumnType<any>>();
    private static listTypes = new Map<any, ColumnType<any>>();

    constructor(public name: string, private castFunc?: CastFunction<T>, public isList: boolean = false) {
        if (!castFunc) {
            this.castFunc = (from: any) => {
                throw new Error("UnsupportedOperationException");
            };
        }
        if (isList) {
            ColumnType.listTypes.set(this.name, this);
        } else {
            ColumnType.plainTypes.set(this.name, this);
        }
    }

    public castService(from: any): T {
        return this.castFunc!(from);
    }

    public static getType(name: string, isList: boolean = false): ColumnType<any> | undefined {
        return isList ? ColumnType.listTypes.get(name) : ColumnType.plainTypes.get(name);
    }

    public static isConvertable(from: ColumnType<any>, to: ColumnType<any>): boolean {
        if (from === to || to === ColumnType.STRING) {
            return true;
        }

        if (from === ColumnType.INTEGER && (to === ColumnType.DOUBLE || to === ColumnType.LONG)) {
            return true;
        }

        if (from === ColumnType.LONG && to === ColumnType.DOUBLE) {
            return true;
        }

        if (to.isList) {
            const fromPlain = from.toPlain();
            const toPlain = to.toPlain();
            if (fromPlain && toPlain) {
                return ColumnType.isConvertable(fromPlain, toPlain);
            }
        }

        return false;
    }

    public toPlain(): ColumnType<any> | undefined {
        if (this.isList) {
            return ColumnType.plainTypes.get(this.name);
        }
        return this;
    }

    public toList(): ColumnType<any> | undefined {
        if (!this.isList) {
            return ColumnType.listTypes.get(this.name);
        }
        return this;
    }

    public static getResonableCompatibleConvertionType(types: Set<ColumnType<any>>): ColumnType<any> {
        const it = types.values();
        let curr = it.next().value;
        let li = curr.isList;
        let ret = curr.toPlain();
        for (const type of it) {
            curr = type;
            const plain = curr.toPlain();
            if (!ColumnType.isConvertable(plain!, ret!)) {
                ret = ColumnType.isConvertable(ret!, plain!) ? plain : ColumnType.STRING;
            }
            if (!li) {
                li = curr.isList;
            }
        }

        return li ? ret!.toList() : ret!;
    }
    public static getConvertibleTypes(fromType: ColumnType<any>): Set<ColumnType<any>> {
        const types = new Set<ColumnType<any>>();
        for (const type of ColumnType.plainTypes.values()) {
            if (ColumnType.isConvertable(fromType, type)) {
                types.add(type);
            }
        }
        return types;
    }

}
