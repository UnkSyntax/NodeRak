import { BitStream } from "../bitstream";

export class Reliability {
    constructor() {}

    handleSocketReceiveFromConnectedPlayer(buffer: Buffer, length: number, mtu_size: number): boolean {
        if (length <= 1 || !buffer) {
            return true;
        }

        const socketData = new BitStream(buffer, length, false);
        const hasAcks = socketData.readBoolean()

        if (hasAcks) {
            
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