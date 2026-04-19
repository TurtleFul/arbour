import { AgentSocketHandler } from "../agent-socket-handler";
import { ArbourServer } from "../arbour-server";
import { callbackError, callbackResult, checkLogin, ArbourSocket, ValidationError } from "../util-server";
import { AgentSocket } from "../../common/agent-socket";
import { StackAutoUpdateSettings } from "../../common/types";

export class StackAutoUpdateSocketHandler extends AgentSocketHandler {
    create(socket: ArbourSocket, server: ArbourServer, agentSocket: AgentSocket) {

        agentSocket.on("getStackAutoUpdate", async (stackName: unknown, callback: unknown) => {
            try {
                checkLogin(socket);

                if (typeof stackName !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                const settings = await server.autoUpdateManager.getSettings(stackName);
                callbackResult({ ok: true, settings }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("setStackAutoUpdate", async (stackName: unknown, settings: unknown, callback: unknown) => {
            try {
                checkLogin(socket);

                if (typeof stackName !== "string") {
                    throw new ValidationError("Stack name must be a string");
                }

                if (
                    typeof settings !== "object" ||
                    settings === null ||
                    !("mode" in settings) ||
                    typeof (settings as Record<string, unknown>).mode !== "string"
                ) {
                    throw new ValidationError("Invalid settings");
                }

                const s = settings as StackAutoUpdateSettings;
                if (![ "disabled", "immediate", "scheduled" ].includes(s.mode)) {
                    throw new ValidationError("Invalid mode");
                }
                if (s.mode === "scheduled" && !s.schedule) {
                    throw new ValidationError("Schedule is required for scheduled mode");
                }

                await server.autoUpdateManager.setSettings(stackName, s);
                callbackResult({ ok: true, msg: "Saved", msgi18n: true }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }
}
