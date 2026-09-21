import assert from "node:assert/strict";
import path from "node:path";
import { mock, test } from "node:test";

const destinationPath = "D:\\Teste-Resultado";
const oldFolder = path.join(destinationPath, "Recovery_anterior");
const newFolder = path.join(destinationPath, "Recovery_atual");
const startedAt = 100_000;
let includeNewFolder = false;
const visited = [];
const entry = (name, directory) => ({
  name, isDirectory: () => directory, isFile: () => !directory,
});
mock.module("node:fs/promises", {
  namedExports: {
    readdir: async (directory) => {
      visited.push(directory);
      if (directory === destinationPath) {
        return [entry("Recovery_anterior", true), ...(includeNewFolder ? [entry("Recovery_atual", true)] : [])];
      }
      if (directory === oldFolder) return [entry("fora-antigo.txt", false)];
      if (directory === newFolder) return [entry("dentro.txt", false)];
      assert.fail("Pasta inesperada: " + directory);
    },
    stat: async (filePath) => ({
      birthtimeMs: filePath === oldFolder ? startedAt - 30_000 : startedAt + 100,
      mtimeMs: filePath === oldFolder ? startedAt - 30_000 : startedAt + 100,
      size: 32,
    }),
  },
});
const { collectRecoveredResults } = await import("../services/recoveryResultService.js");

test("nenhuma pasta nova: não reaproveita arquivos de uma recuperação anterior recente", async () => {
  const result = await collectRecoveredResults({
    destinationPath, previousFolders: [oldFolder], startedAt, resultFilters: ["*.txt"],
  });
  assert.equal(result.filesFound, 0);
  assert.deepEqual(result.recoveryFolders, []);
  assert.ok(!visited.includes(oldFolder), "não percorre a recuperação anterior");
});

test("somente a pasta criada pela operação atual é indexada", async () => {
  includeNewFolder = true;
  const result = await collectRecoveredResults({
    destinationPath, previousFolders: [oldFolder], startedAt, resultFilters: ["*.txt"],
  });
  assert.deepEqual(result.recoveryFolders, [newFolder]);
  assert.deepEqual(result.results.map((file) => file.name), ["dentro.txt"]);
});
