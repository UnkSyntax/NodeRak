import { Socket, createSocket, RemoteInfo } from "dgram";
import { kyretardizeDatagram } from "../utils";
import { BitStream } from "../bitstream";
import { PacketEnumeration } from "../structures";
import { Reliability } from "./reliability";

const ENABLE_DEBUG = true;

export interface ConnectionOptions {
    ip: string;
    port: number;
    password?: string
}

export class Connection {
    public ip: string;
    public port: number;
    public password: string;
    public socket: Socket;
    public reliability: Reliability;

    constructor({ ip, port, password = '' }: ConnectionOptions) {
        this.ip = ip;
        this.port = port;
        this.password = password;
        this.socket = createSocket('udp4');
        this.reliability = new Reliability();
        this.socket.on('message', this.onMessage.bind(this));
        this.socket.on('close', this.onDisconnect.bind(this));
        this.socket.on('error', this.onError.bind(this));
    }

    async onDisconnect() {
        console.log("Client disconnected.");
    }

    async onError(err: Error) {
        console.error(err);
    }

    async onMessage(message: Buffer, rinfo: RemoteInfo) {
        if (ENABLE_DEBUG) {
            console.log("---------- NEW PACKET ----------");
            console.log('[incoming] message from server:');
            console.log('[incoming] -> len', message.length);
            console.log('[incoming] -> message', message);
            console.log('[incoming] -> message as string', message.toString());
            console.log('[incoming] -> rinfo', rinfo);
            console.log('[incoming] -> packet', message[0]);
            console.log("-------------------------------");
        }

        if (message[0] == PacketEnumeration.ID_OPEN_CONNECTION_COOKIE && message.length == 3) {
            const cookies_buf = Buffer.alloc(3);
            cookies_buf[0] = PacketEnumeration.ID_OPEN_CONNECTION_REQUEST;
            cookies_buf[1] = message[1] ^ 0x6969;
            cookies_buf[2] = message[2] ^ 0x6969;
            await this.sendMessage(cookies_buf, cookies_buf.length);
        }

        if (message[0] == PacketEnumeration.ID_OPEN_CONNECTION_REPLY) {
            const bs = new BitStream();
            bs.writeInt8(PacketEnumeration.ID_CONNECTION_REQUEST);
            this.reliability.send(bs);
        }
    }

    async init() {
        console.log(`Connecting to ${this.ip}:${this.port}`);
        this.socket.connect(this.port, this.ip, this.onConnected.bind(this));
    }

    async sendMessage(_message: Buffer, len: number) {
        if (this.socket) {
            const message = Buffer.alloc(len + 1);
            _message.copy(message);
            const encrBuffer = await kyretardizeDatagram(message, message.length, this.port);
            this.socket.send(encrBuffer);
            if (ENABLE_DEBUG) {
                console.log("---------- NEW PACKET ----------");
                console.log('[outcoming] sendMessage');
                console.log('[outcoming] -> message', message);
                console.log('[outcoming] -> encrBuffer', encrBuffer);
                console.log('[outcoming] -> address', this.ip);
                console.log('[outcoming] -> port', this.port);
                console.log("-------------------------------");
            }
        }
    }

    async onConnected() {
        if (ENABLE_DEBUG) {
            console.log(`Socket connected to ${this.ip}:${this.port}`);
        }
        const buf = Buffer.alloc(3);
        buf[0] = PacketEnumeration.ID_OPEN_CONNECTION_REQUEST;
        buf[1] = 0x69;
        buf[2] = 0x69;
        await this.sendMessage(buf, buf.length);
    }
}