import { BitStream } from "../bitstream";
import { RangeList } from "../structures/rangeList";

const DEFAULT_MTU_SIZE = 1500;
const MAXIMUM_MTU_SIZE = 576;

export class Reliability {
    splitPacketId: number;
    messageNumber: number;
    lastAckTime: number;

    constructor() {
        this.splitPacketId = 0;
        this.messageNumber = 0;
        this.lastAckTime = 0;
    }

    handleSocketReceiveFromConnectedPlayer(buffer: Buffer, length: number, mtu_size: number): boolean {
        if (length <= 1 || !buffer) {
            return true;
        }

        const socketData = new BitStream(buffer, length, false);
        const hasAcks = socketData.readBoolean()
        let time = new Date();

        if (hasAcks) {
            let messageNumber: number;
            const rangeList = new RangeList<number>();
        }
        
        return true;
    }

    deserialize() {

    }

    send(bs: BitStream) {

    }

    sendBitStream() {
        
    }
}