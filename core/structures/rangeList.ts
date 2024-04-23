import { BitStream } from "./../bitstream";

class RangeNode<range_type> {
    constructor(
        public minIndex: range_type, 
        public maxIndex: range_type
    ) {}
}

function RangeNodeComp<range_type>(a: range_type, b: RangeNode<range_type>): number {
    if (a < b.minIndex) {
        return -1;
    } else if (a === b.minIndex) {
        return 0;
    } else {
        return 1;
    }
}

export class RangeList<range_type extends number> {
    public ranges: Array<RangeNode<range_type>> = [];

    constructor() {}

    public serialize(from: BitStream, needBytes: number, maxBits: number, clearSerialized: boolean) {
        if (this.ranges.length > 0xFFFF) {
            throw new Error("Invalid size!");
        }

        const tempBS = new BitStream();
        let bitsWritten = 0;
        let countWritten = 0;

        for (let i = 0; i < this.ranges.length; i++) {
            if (16 + bitsWritten + needBytes * 8 * 2 + 1 > maxBits) {
                break;
            }
            tempBS.writeBoolean(this.ranges[i].minIndex === this.ranges[i].maxIndex);
            tempBS.writeInt16(this.ranges[i].minIndex);
            bitsWritten += needBytes * 8 + 1;
            if (this.ranges[i].minIndex != this.ranges[i].maxIndex) {
                tempBS.writeInt32(this.ranges[i].maxIndex);
                bitsWritten += needBytes * 8;
            }
            countWritten++;
        }

        let before = from.numberOfBitsUsed;
        //from.writeCompressed(countWritten);
        bitsWritten += from.numberOfBitsUsed - before;
        from.writeBitStream(tempBS);
    }
}