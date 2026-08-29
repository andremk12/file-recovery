import { execFile } from "node:child_process"
import { promisify } from "node:util"


const execFileAsync = promisify(execFile)

const ENGINE_NAME = "windows-file-recovery"
const ENGINE_COMMAND = "winfr.exe"

function createBaseStatus() {
    return {
        engine: ENGINE_NAME,
        command: ENGINE_COMMAND,
        platform: process.platform,
        checkedAt: new Date().toISOString(),
    }
}

export async function getRecoveryEngineStatus() {
    const baseStatus = createBaseStatus()

    if (process.platform !== "win32") {
        return {
            ...baseStatus,
            available: false,
            executablePath: null,
            reason: "O Windows File Recovery está disponível somento no Windows"
        }
    }

    try {
        const { stdout } = await execFileAsync(
            "where.exe",
            [ENGINE_COMMAND],
            {
                windowsHide: true,
                timeout: 5000,
                encoding: "utf8"
            }
        )

        const executablePath = stdout
                              .split(/\r?\n/)   
                              .map((line) => line.trim())
                              .find(Boolean)

        if (!executablePath) {
            return {
                ...baseStatus,
                available: false,
                executablePath: null,
                reason:
                 "O Windows File Recovery não foi encontrado"
            }
        }

        return {
            ...baseStatus,
            available: true,
            executablePath,
            reason: null,
        }
    } catch (error) {
        return {
            ...baseStatus,
            available: false,
            executablePath: null,
            reason:
                error?.code == "ETIMEDOUT" ? "A verificação do motor excedeu o tempo limite." : "O Windows File Recovery não está instalado ou não esta acessível." 
        }
    }
    



}