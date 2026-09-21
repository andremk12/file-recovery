import assert from "node:assert/strict";
import { EventEmitter, once } from "node:events";
import { readFile } from "node:fs/promises";
import { PassThrough } from "node:stream";
import { mock, test } from "node:test";
import { runInNewContext } from "node:vm";

// Nenhum subprocesso (incluindo winfr, where, taskkill ou Electron) é executado.
const handlers = new Map();
const events = new EventEmitter();
const updates = [];
const sender = {
  isDestroyed: () => false,
  send: (channel, update) => { updates.push(update); events.emit(channel, update); },
};
let child;
const spawn = mock.fn((executable) => {
  const process = new EventEmitter();
  process.pid = 12345;
  process.stdin = new PassThrough();
  process.stdout = new PassThrough();
  process.stderr = new PassThrough();
  process.kill = () => true;
  if (executable === "taskkill.exe") {
    queueMicrotask(() => process.emit("close", 0));
  } else {
    assert.equal(executable, "X:\\Mock\\winfr.exe");
    child = process;
  }
  return process;
});
mock.module("node:child_process", {
  namedExports: { spawn, execFile: () => assert.fail("execFile real é proibido nos testes") },
});
mock.module("electron", {
  namedExports: { ipcMain: { handle: (channel, handler) => handlers.set(channel, handler) } },
});
mock.module("../services/recoveryEngineService.js", {
  namedExports: { getRecoveryEngineStatus: async () => ({
    available: true, executablePath: "X:\\Mock\\winfr.exe",
  }) },
});
mock.module("../services/recoveryEngineTestService.js", {
  namedExports: { testRecoveryEngine: () => assert.fail("teste real do motor é proibido") },
});
const collectRecoveredResults = mock.fn(async () => ({
  filesFound: 1, results: [{ name: "dentro.txt" }], resultsTruncated: false,
  recoveryFolders: ["D:\\Teste-Resultado\\Recovery_mock"],
  filesRecoveredByEngine: 1, filesFilteredOut: 0,
}));
mock.module("../services/recoveryResultService.js", {
  namedExports: { snapshotRecoveryFolders: async () => [], collectRecoveredResults },
});

const { registerRecoveryEngineIpc } = await import("../ipc/recoveryEngineIpc.js");
registerRecoveryEngineIpc();
let api;
runInNewContext(await readFile(new URL("../preload.cjs", import.meta.url), "utf8"), {
  require: (name) => {
    assert.equal(name, "electron");
    return {
      contextBridge: { exposeInMainWorld: (_name, value) => { api = value; } },
      ipcRenderer: {
        invoke: (channel, request) => handlers.get(channel)(
          { sender }, structuredClone(request),
        ),
      },
    };
  },
});

const baseRequest = {
  sourceDrive: "C:", sourceFolder: "C:\\RecoveryLab",
  destinationPath: "D:\\Teste-Resultado", filters: ["*.txt"], mode: "regular",
};

for (const mode of ["regular", "extensive"]) {
  for (const sourceFolder of [
    "C:\\RecoveryLab", "C:\\Users\\Andre\\Área de Trabalho\\Recuperação Teste",
    "C:\\Users\\Andre\\OneDrive\\Área de Trabalho\\recuperacaotestea",
  ]) {
    test("preload → IPC → argv e preview idênticos: " + mode + " " + sourceFolder, async () => {
      const request = { ...baseRequest, sourceFolder, mode };
      const preview = await api.previewRecoveryCommand(request);
      const started = await api.startRealRecovery(request);
      const [executable, args, options] = spawn.mock.calls.at(-1).arguments;
      assert.equal(executable, "X:\\Mock\\winfr.exe");
      assert.deepEqual(args, preview.args);
      assert.deepEqual(args.slice(-2), ["/n", sourceFolder.slice(2) + "\\*.txt"]);
      assert.equal(options.shell, false);
      assert.equal(options.windowsHide, true);
      assert.equal(started.command, preview.displayCommand);
      assert.deepEqual(started.filters, preview.filters);
      child.emit("spawn");
      assert.equal(updates.at(-1).command, preview.displayCommand);
      const active = await api.getActiveRealRecovery();
      assert.equal(active.recoveryId, started.recoveryId);
      child.stdout.emit("data", Buffer.from("Recuperando 42%"));
      assert.ok(updates.some((update) => update.type === "progress" && update.progress === 42));
      const completed = once(events, "recovery:real-update");
      child.emit("close", 0);
      await completed;
      // A indexação mockada é assíncrona; aguarda o fim antes do próximo teste.
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(updates.at(-1).type, "completed");
      assert.deepEqual(collectRecoveredResults.mock.calls.at(-1).arguments[0].resultFilters, ["*.txt"]);
      assert.equal(await api.getActiveRealRecovery(), null);
    });
  }
}

test("erros de validação não iniciam processos e são iguais no preview e execução", async () => {
  for (const change of [
    { sourceFolder: "D:\\RecoveryLab" }, { sourceFolder: "" },
    { sourceFolder: "\\\\server\\share" }, { filters: ["..\\*.txt"] },
  ]) {
    const request = { ...baseRequest, ...change };
    let previewMessage;
    await assert.rejects(api.previewRecoveryCommand(request), (error) => {
      previewMessage = error.message;
      return true;
    });
    const previousCount = spawn.mock.callCount();
    await assert.rejects(api.startRealRecovery(request), (error) => error.message === previewMessage);
    assert.equal(spawn.mock.callCount(), previousCount);
  }
});

for (const [duplicatePolicy, response] of [["keepBoth", "b"], ["skip", "n"], ["overwrite", "a"]]) {
  test("responde ao prompt de duplicados em extensive: " + duplicatePolicy, async () => {
    await api.startRealRecovery({ ...baseRequest, mode: "extensive", duplicatePolicy });
    const writes = [];
    child.stdin.on("data", (chunk) => writes.push(chunk.toString()));
    child.stdout.emit("data", Buffer.from("keep (b)oth always"));
    assert.deepEqual(writes, [response + "\r\n"]);
    child.emit("error", new Error("encerramento simulado"));
    assert.equal(await api.getActiveRealRecovery(), null);
    assert.equal(updates.at(-1).type, "failed");
  });
}

test("cancelamento preserva operação e evento terminal", async () => {
  const started = await api.startRealRecovery(baseRequest);
  assert.equal((await api.cancelRealRecovery("outro-id")).cancelled, false);
  assert.equal((await api.cancelRealRecovery(started.recoveryId)).cancelled, true);
  child.emit("close", 1);
  assert.equal(updates.at(-1).type, "cancelled");
  assert.equal(await api.getActiveRealRecovery(), null);
});
