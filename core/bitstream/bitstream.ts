// From BitStream.cpp (fix)

const BITSTREAM_STACK_ALLOCATION_SIZE: number = 256;

function BITS_TO_BYTES(bits: number): number { return (((bits) + 7) >> 3) }
function BYTES_TO_BITS(bytes: number): number { return ((bytes) << 3) }

export class BitStream {
    numberOfBitsUsed: number = 0;
    numberOfBitsAllocated: number = 0;
    readOffset: number = 0;
    data: Buffer | null = null;
    stackData: Buffer = Buffer.alloc(BITSTREAM_STACK_ALLOCATION_SIZE);
    copyData: boolean = false;
    //stackData: Buffer | null;

    constructor();
    constructor(initialBytesToAllocate: number);
    constructor(_data: Buffer, lengthInBytes: number, _copyData: boolean);
    constructor(arg1?: Buffer | number, arg2?: number, arg3?: boolean) {
        if (arg1 === undefined && arg2 === undefined && arg3 === undefined) {
            this.numberOfBitsUsed = 0;
            this.numberOfBitsAllocated = BITSTREAM_STACK_ALLOCATION_SIZE * 8;
            this.readOffset = 0;
            this.data = this.stackData;
            this.copyData = true;
        } else if (typeof arg1 === 'number' && arg2 === undefined && arg3 === undefined) {
            this.numberOfBitsUsed = 0;
            this.readOffset = 0;
            
            let initialBytesToAllocate = arg1;
            if (initialBytesToAllocate <= BITSTREAM_STACK_ALLOCATION_SIZE) {
                this.data = this.stackData;
                this.numberOfBitsAllocated = BITSTREAM_STACK_ALLOCATION_SIZE * 8;
            } else {
                this.data = Buffer.alloc(initialBytesToAllocate);
                this.numberOfBitsAllocated = initialBytesToAllocate << 3;
            }
            this.copyData = true;
        } else if (arg1 instanceof Buffer && typeof arg2 === 'number' && typeof arg3 === 'boolean') {
            const _data = arg1;
            const lengthInBytes = arg2;
            const _copyData = arg3;
            
            this.numberOfBitsUsed = lengthInBytes << 3;
            this.readOffset = 0;
            this.copyData = _copyData;
            this.numberOfBitsAllocated = lengthInBytes << 3;

            if (this.copyData) {
                if (lengthInBytes > 0) {
                    if (lengthInBytes < BITSTREAM_STACK_ALLOCATION_SIZE) {
                        this.data = this.stackData;
                        this.numberOfBitsAllocated = BITSTREAM_STACK_ALLOCATION_SIZE << 3;
                    } else {
                        this.data = Buffer.alloc(lengthInBytes);
                    }
                    _data.copy(this.data, 0, 0, lengthInBytes);
                } else {
                    this.data = null;
                }
            } else {
                this.data = _data;
            }
        }
    }

    setNumberOfBitsAllocated(lengthInBits: number): void {
        this.numberOfBitsAllocated = lengthInBits;
    }

    reset(): void {
        this.numberOfBitsUsed = 0;
        this.readOffset = 0;
    }

    writeInt8(value: number) {
        this.writeBits(Buffer.from([value]), 8, true);
    }

    writeInt16(value: number) {
        this.writeBits(Buffer.from([value]), 16, true);
    }

    writeInt32(value: number) {
        this.writeBits(Buffer.from([value]), 32, true);
    }

    writeFloat(value: number) {
        this.writeBits(Buffer.from([value]), 32, true);
    }

    writeBoolean(value: boolean) {
        this.addBitsAndReallocate(1);
        if (!value) {
            if ((this.numberOfBitsUsed & 7) === 0) {
                this.data![this.numberOfBitsUsed >> 3] = 0;
            }
        } else {
            const numberOfBitsMod8 = this.numberOfBitsUsed & 7;
            if (numberOfBitsMod8 === 0) {
                this.data![this.numberOfBitsUsed >> 3 ] = 0x80;
            } else {
                this.data![this.numberOfBitsUsed >> 3 ] |= 0x80 >> (numberOfBitsMod8);
            }
        }
        this.numberOfBitsUsed++;
    }

    writeBufferArray(value: Buffer, numberOfBytes: number) {
        this.writeBits(value, numberOfBytes * 8, true);
    }

    writeBitStream(value: BitStream) {
        if (value.data) {
            this.writeBits(value.data, value.numberOfBitsUsed, false);
        }
    }

    writeBits(value: Buffer, numberOfBitsToWrite: number, rightAlignedBits: boolean) {
        if (numberOfBitsToWrite <= 0) {
            return;
        }
        
        let offset = 0;
        let dataByte: number;
        let numberOfBitsUsedMod8: number;

        this.addBitsAndReallocate(numberOfBitsToWrite);
        numberOfBitsUsedMod8 = this.numberOfBitsUsed & 7;

        while (numberOfBitsToWrite > 0) {
            dataByte = value[offset];

            if (numberOfBitsToWrite < 8 && rightAlignedBits) {
                dataByte <<= 8 - numberOfBitsToWrite;
            }

            if (numberOfBitsUsedMod8 == 0) {
                this.data![(this.numberOfBitsUsed >> 3)] = dataByte;
            } else {
                this.data![(this.numberOfBitsUsed >> 3)] |= dataByte >> numberOfBitsUsedMod8;
                if (8 - numberOfBitsUsedMod8 < 8 && 8 - numberOfBitsUsedMod8 < numberOfBitsToWrite) {
                    this.data![(this.numberOfBitsUsed >> 3) + 1] = dataByte << (8 - numberOfBitsUsedMod8);
                }                
            }

            if (numberOfBitsToWrite >= 8) {
                this.numberOfBitsUsed += 8;
            } else {
                this.numberOfBitsUsed += numberOfBitsToWrite;
            }

            numberOfBitsToWrite -= 8;
            offset++;
        }
    }

    readBoolean(): boolean {
        if (this.readOffset + 1 > this.numberOfBitsUsed) {
            return false;
        }

        if (this.data![this.readOffset >> 3] & (0x80 >> (this.readOffset++ % 8))) {
            return true;
        } else {
            return false;
        }
    }

    readInt8() {
        const test = this.readBits(8, false);
    }

    readInt16() {
        const test = this.readBits(16, false);
    }

    readInt32() {
        const test = this.readBits(32, false);
    }

    readBits(numberOfBitsToRead: number, alignBitsToRight: boolean) {
        if (this.readOffset + numberOfBitsToRead > this.numberOfBitsUsed) {
            return false;
        }

        const readOffsetMod8 = this.readOffset & 8;
        let offset = 0;
        const output = Buffer.alloc(BITS_TO_BYTES(numberOfBitsToRead));

        while (numberOfBitsToRead > 0) {
            output[offset] |= this.data![this.readOffset >> 3] << readOffsetMod8
            console.log(this.data![this.readOffset >> 3] << readOffsetMod8);
            if (readOffsetMod8 > 0 && numberOfBitsToRead > 8 - readOffsetMod8) {
                output[offset] |= this.data![(this.readOffset >> 3) + 1] >> (8 - readOffsetMod8);
            }

            numberOfBitsToRead -= 8;

            if (numberOfBitsToRead < 0) {
                if (alignBitsToRight) {
                    output[offset] >>= -numberOfBitsToRead;
                }
                this.readOffset += 8 + numberOfBitsToRead;
            } else {
                this.readOffset += 8;
            }

            offset++;
        }

        return output;
    }

    addBitsAndReallocate(numberOfBitsToWrite: number) {
        if (numberOfBitsToWrite <= 0) {
            return;
        }

        let newNumberOfBitsAllocated = numberOfBitsToWrite + this.numberOfBitsUsed;
        if (numberOfBitsToWrite + this.numberOfBitsUsed > 0 && ((this.numberOfBitsAllocated - 1 ) >> 3) < ((newNumberOfBitsAllocated - 1 ) >> 3)) {
            newNumberOfBitsAllocated = ( numberOfBitsToWrite + this.numberOfBitsUsed ) * 2;
            const amountToAllocate = BITS_TO_BYTES(newNumberOfBitsAllocated);
            if (this.data == this.stackData) {
                if (amountToAllocate > BITSTREAM_STACK_ALLOCATION_SIZE) {
                    this.data = Buffer.alloc(amountToAllocate);
                    this.stackData.copy(this.data, 0, 0, BITS_TO_BYTES(this.numberOfBitsAllocated));
                } else {
                    const newData = Buffer.alloc(amountToAllocate);
                    newData.set(this.data);
                    this.data = newData;
                }
            }
        }

        if (newNumberOfBitsAllocated > this.numberOfBitsAllocated) {
            this.numberOfBitsAllocated = newNumberOfBitsAllocated;
        }
    }

    getData(): Buffer {
        return this.data!;
    }

    // PrintBits(): void {
    //     if (this.numberOfBitsUsed <= 0) {
    //         console.log("No bits");
    //         return;
    //     }
    
    //     for (let counter = 0; counter < BITS_TO_BYTES(this.numberOfBitsUsed); counter++) {
    //         let stop: number;
    
    //         if (counter === (this.numberOfBitsUsed - 1) >> 3) {
    //             stop = 8 - (((this.numberOfBitsUsed - 1) & 7) + 1);
    //         } else {
    //             stop = 0;
    //         }
    
    //         for (let counter2 = 7; counter2 >= stop; counter2--) {
    //             if ((this.data![counter] >> counter2) & 1) {
    //                 console.log('1');
    //             } else {
    //                 console.log('0');
    //             }
    //         }
    
    //         console.log(' ');
    //     }
    
    //     console.log();
    // }
    
}
