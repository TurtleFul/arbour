import { ArbourServer } from "./arbour-server";
import * as os from "node:os";
import { LimitQueue } from "./utils/limit-queue";
import { ArbourSocket } from "./util-server";
import {
    PROGRESS_TERMINAL_ROWS,
    TERMINAL_COLS,
    TERMINAL_ROWS
} from "../common/util-common";
import { sync as commandExistsSync } from "command-exists";
import { log } from "./log";
import { spawn as ptySpawn, type IPty } from "bun-pty";

/**
 * Terminal for running commands, no user interaction
 */
export class Terminal {
    protected static terminalMap : Map<string, Terminal> = new Map();

    protected _pty? : IPty;
    protected server : ArbourServer;
    protected buffer : LimitQueue<string> = new LimitQueue(100);
    protected _name : string;

    protected file : string;
    protected args : string[];
    protected cwd : string;
    protected callback? : (exitCode : number) => void;

    protected _rows : number = TERMINAL_ROWS;
    protected _cols : number = TERMINAL_COLS;

    public enableKeepAlive : boolean = false;
    protected keepAliveInterval? : NodeJS.Timeout;
    protected kickDisconnectedClientsInterval? : NodeJS.Timeout;

    protected socketList : Record<string, ArbourSocket> = {};

    constructor(server : ArbourServer, name : string, file : string, args : string | string[], cwd : string) {
        this.server = server;
        this._name = name;
        this.file = file;
        this.args = Array.isArray(args) ? args : [ args ];
        this.cwd = cwd;

        Terminal.terminalMap.set(this.name, this);
    }

    get rows() {
        return this._rows;
    }

    set rows(rows : number) {
        this._rows = rows;
    }

    get cols() {
        return this._cols;
    }

    set cols(cols : number) {
        this._cols = cols;
    }

    public start() {
        log.debug("Terminal", "Terminal " + this.name + " starting");

        if (this._pty) {
            return;
        }

        this.kickDisconnectedClientsInterval = setInterval(() => {
            for (const socketID in this.socketList) {
                const socket = this.socketList[socketID];
                if (!socket.connected) {
                    log.debug("Terminal", "Kicking disconnected client " + socket.id + " from terminal " + this.name);
                    this.leave(socket);
                }
            }
        }, 60 * 1000);

        if (this.enableKeepAlive) {
            log.debug("Terminal", "Keep alive enabled for terminal " + this.name);

            this.keepAliveInterval = setInterval(() => {
                const numClients = Object.keys(this.socketList).length;

                if (numClients === 0) {
                    log.debug("Terminal", "Terminal " + this.name + " has no client, closing...");
                    this.close();
                } else {
                    log.debug("Terminal", "Terminal " + this.name + " has " + numClients + " client(s)");
                }
            }, 60 * 1000);
        } else {
            log.debug("Terminal", "Keep alive disabled for terminal " + this.name);
        }

        try {
            for (const socketID in this.socketList) {
                const socket = this.socketList[socketID];
                socket.emitAgent("terminalWrite", this.name, this.file + " " + this.args.join(" ") + "\r\n");
            }

            this._pty = ptySpawn(this.file, this.args, {
                name: "xterm-256color",
                cols: this._cols,
                rows: this._rows,
                cwd: this.cwd,
                env: {
                    ...process.env,
                    TERM: "xterm-256color",
                },
            });

            this._pty.onData((data: string) => {
                this.onData(data);
            });

            this._pty.onExit((res) => {
                this.exit({ exitCode: res.exitCode,
                    signal: res.signal ? Number(res.signal) : undefined });
            });
        } catch (error) {
            if (error instanceof Error) {
                clearInterval(this.keepAliveInterval);

                log.error("Terminal", "Failed to start terminal: " + error.message);
                const exitCode = Number(error.message.split(" ").pop());
                this.exit({
                    exitCode,
                });
            }
        }
    }

    protected onData(data: string) {
        this.buffer.pushItem(data);

        for (const socketID in this.socketList) {
            const socket = this.socketList[socketID];
            socket.emitAgent("terminalWrite", this.name, data);
        }
    }

    protected exit = (res : {exitCode: number, signal?: number | undefined}) => {
        for (const socketID in this.socketList) {
            const socket = this.socketList[socketID];
            socket.emitAgent("terminalExit", this.name, res.exitCode);
        }

        this.socketList = {};

        Terminal.terminalMap.delete(this.name);
        log.debug("Terminal", "Terminal " + this.name + " exited with code " + res.exitCode);

        clearInterval(this.keepAliveInterval);
        clearInterval(this.kickDisconnectedClientsInterval);

        this._pty = undefined;

        if (this.callback) {
            this.callback(res.exitCode);
        }
    };

    public onExit(callback : (exitCode : number) => void) {
        this.callback = callback;
    }

    public join(socket : ArbourSocket) {
        log.debug("Terminal", "Terminal " + this.name + " socket " + socket.id + " joining");

        this.socketList[socket.id] = socket;
    }

    public leave(socket : ArbourSocket) {
        log.debug("Terminal", "Terminal " + this.name + " socket " + socket.id + " leaving");

        delete this.socketList[socket.id];
    }

    public get name() {
        return this._name;
    }

    getBuffer() : string {
        if (this.buffer.length === 0) {
            return "";
        }
        return this.buffer.join("");
    }

    public resize(cols: number, rows: number) {
        this._cols = cols;
        this._rows = rows;
        this._pty?.resize(cols, rows);
    }

    close() {
        clearInterval(this.keepAliveInterval);
        this._pty?.kill("SIGTERM");
    }

    public static getTerminal(name : string) : Terminal | undefined {
        return Terminal.terminalMap.get(name);
    }

    public static getOrCreateTerminal(server : ArbourServer, name : string, file : string, args : string | string[], cwd : string) : Terminal {
        let terminal = Terminal.getTerminal(name);
        if (!terminal) {
            terminal = new Terminal(server, name, file, args, cwd);
        }
        return terminal;
    }

    public static exec(server : ArbourServer, socket : ArbourSocket | undefined, terminalName : string, file : string, args : string | string[], cwd : string) : Promise<number> {
        return new Promise((resolve, reject) => {
            if (Terminal.terminalMap.has(terminalName)) {
                reject("Another operation is already running, please try again later.");
                return;
            }

            let terminal = new Terminal(server, terminalName, file, args, cwd);
            terminal.rows = PROGRESS_TERMINAL_ROWS;

            if (socket) {
                terminal.join(socket);
            }

            terminal.onExit((exitCode : number) => {
                resolve(exitCode);
            });
            terminal.start();
        });
    }

    public static getTerminalCount() {
        return Terminal.terminalMap.size;
    }
}

/**
 * Interactive terminal — used for container exec
 */
export class InteractiveTerminal extends Terminal {
    public write(input : string) {
        this._pty?.write(input);
    }
}

/**
 * User interactive terminal — bash or powershell console (behind ARBOUR_ENABLE_CONSOLE flag).
 */
export class MainTerminal extends InteractiveTerminal {
    constructor(server : ArbourServer, name : string) {
        if (!server.config.enableConsole) {
            throw new Error("Console is not enabled.");
        }

        let shell;
        if (os.platform() === "win32") {
            if (commandExistsSync("pwsh.exe")) {
                shell = "pwsh.exe";
            } else {
                shell = "powershell.exe";
            }
        } else {
            shell = "bash";
        }
        super(server, name, shell, [], server.stacksDir);
    }
}
