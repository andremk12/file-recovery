import { execFile } from "node:child_process"
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DRIVE_TYPES = {
  0: "unknown",
  1: "no-root",
  2: "removable",
  3: "fixed",
  4: "network",
  5: "optical",
  6: "ram",
};

const POWERSHELL_COMMAND = `
    $ErrorActionPreference = "Stop"


    Get-CimInstance -ClassName Win32_LogicalDisk |
            Select-Object DeviceID, VolumeName, FileSystem, DriveType, Size, FreeSpace |
            ConvertTo-Json -Compress
`.trim()

function parseNullableNumber(value) {
    if (value === null || value === undefined) {
        return null
    }

    
    const parsedValue = Number(value);

    return Number.isFinite(parsedValue) ? parsedValue : null
}

function normalizeDrive(drive) {
    const typeCode = Number(drive.DriveType)

    const driveLetter = drive.DeviceID?.toUpperCase()
    const systemDrive = process.env.systemDrive?.toUpperCase()

    return {
        id: driveLetter,
        letter: driveLetter,
        label: drive.VolumeName?.trim() || "Sem nome",
        fileSystem: drive.FileSystem || "Desconhecido",
        typeCode,
        type: DRIVE_TYPES[typeCode] || "unknown",
        totalBytes: parseNullableNumber(drive.Size),
        freeBytes: parseNullableNumber(drive.FreeSpace),
        isSystem: driveLetter === systemDrive,
    }
}

export async function getDrive() {
    if (process.platform !== "win32") {
        throw new Error (
            "A listagem de discos está disponível apenas no Windows"
        )
    }

    try {
        const { stdout } = await execFileAsync(
            "powershell.exe",
            [
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                POWERSHELL_COMMAND,
            ],
            {
                encoding: "utf8",
                windowsHide: true,
                timeout: 10_000,
                maxBuffer: 1024 * 1024,
            },
        )

        if (!stdout.trim()) {
            return []
        }
        
        const result = JSON.parse(stdout);
        const drives = Array.isArray(result) ? result : [result]

        return drives
            .map(normalizeDrive)
            .sort((firstDrive, secondDrive) => 
                firstDrive.letter.localeCompare(secondDrive.letter),
            );
    } catch (error) {
        const message =  
            error instanceof Error 
                ? error.message
                : "Erro desconhecido."

        throw new Error(
            `Não foi possível consultar os discos: ${message}`,
        )
    }
}

