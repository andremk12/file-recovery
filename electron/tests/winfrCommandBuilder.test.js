import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildWinfrCommand,
  normalizeSourceFolder,
} from "../services/winfrCommandBuilder.js";

const baseRequest = {
  sourceDrive: "C:",
  sourceFolder: "C:\\RecoveryLab",
  destinationPath: "D:\\Teste-Resultado",
  mode: "regular",
};

const folders = [
  ["C:\\RecoveryLab", "\\RecoveryLab\\"],
  ["C:\\RecoveryLab\\", "\\RecoveryLab\\"],
  ["C:\\Users\\Andre\\Downloads\\FOTOS", "\\Users\\Andre\\Downloads\\FOTOS\\"],
  ["C:\\Users\\Andre\\Área de Trabalho\\Recuperação Teste", "\\Users\\Andre\\Área de Trabalho\\Recuperação Teste\\"],
  ["C:\\Users\\Andre\\OneDrive\\Área de Trabalho\\recuperacaotestea", "\\Users\\Andre\\OneDrive\\Área de Trabalho\\recuperacaotestea\\"],
  ["c:\\RecoveryLab\\\\", "\\RecoveryLab\\"],
  ["c:/RecoveryLab//", "\\RecoveryLab\\"],
  ["\\RecoveryLab\\", "\\RecoveryLab\\"],
  ["C:\\RecoveryLab\\\\Subpasta\\", "\\RecoveryLab\\Subpasta\\"],
];

for (const [sourceFolder, expectedFolder] of folders) {
  test("normaliza " + sourceFolder, () => {
    assert.equal(normalizeSourceFolder(sourceFolder, "c:"), expectedFolder);
    assert.equal(normalizeSourceFolder(expectedFolder, "C:"), expectedFolder);
  });

  for (const mode of ["regular", "extensive"]) {
    for (const filters of [[], ["*.txt"], ["*.txt", "*.pdf", "*.docx"]]) {
      test([sourceFolder, mode, filters.join(",") || "sem extensão"].join(" / "), () => {
        const request = { ...baseRequest, sourceFolder, mode, filters };
        const original = structuredClone(request);
        const command = buildWinfrCommand(request);
        const scoped = filters.length
          ? filters.map((filter) => expectedFolder + filter)
          : [expectedFolder];
        assert.deepEqual(command.args, [
          "C:", "D:\\Teste-Resultado", "/" + mode, "/a",
          ...(mode === "regular" ? ["/o:b"] : []),
          ...scoped.flatMap((filter) => ["/n", filter]),
        ]);
        assert.deepEqual(command.filters, scoped);
        assert.deepEqual(command.resultFilters, filters);
        assert.deepEqual(request, original, "não altera a solicitação");
        for (const filter of command.filters) {
          assert.ok(filter.startsWith(expectedFolder));
          assert.ok(!filter.startsWith("\\\\"), "não gera UNC");
          assert.ok(!filter.includes('"'), "aspas não fazem parte do argv");
        }
        assert.ok(!command.args.includes("*.txt"), "nunca emite extensão global");
        if (filters.length) {
          assert.ok(!command.filters.includes(expectedFolder), "não adiciona /n amplo junto às extensões");
        }
      });
    }
  }
}

test("rejeita unidade diferente sem alterar a solicitação", () => {
  assert.throws(() => buildWinfrCommand({
    ...baseRequest, sourceFolder: "D:\\RecoveryLab",
  }), /não pertence ao disco/);
});

for (const sourceFolder of [undefined, null, "", "   "]) {
  test("não permite recuperação global sem pasta: " + String(sourceFolder), () => {
    assert.equal(normalizeSourceFolder(sourceFolder, "C:"), null);
    assert.throws(() => buildWinfrCommand({ ...baseRequest, sourceFolder }), /Selecione uma pasta/);
  });
}

for (const sourceFolder of [
  "C:\\", "\\", ".", "C:RecoveryLab", "\\\\server\\share\\RecoveryLab",
  "//server/share/RecoveryLab", "\\\\?\\C:\\RecoveryLab",
  "C:\\RecoveryLab\\..\\Outra", "..\\RecoveryLab",
  'C:\\Pasta "Teste"', "C:\\Recovery*Lab", "C:\\RecoveryLab:stream", 123,
]) {
  test("rejeita pasta ambígua: " + sourceFolder, () => {
    assert.throws(() => buildWinfrCommand({ ...baseRequest, sourceFolder }), /pasta de origem/i);
  });
}

for (const filters of [
  ["\\Outra\\*.txt"], ["C:\\Outra\\*.txt"], ["..\\*.txt"], ["*.txt", "\\Outra\\"],
  ["/n *.txt"], ['"*.txt"'], ["*.*"], ["*"], ["*.txt\r\n/a"], [""],
  "txt", [null], Array(21).fill("*.txt"),
]) {
  test("rejeita filtro inconsistente: " + JSON.stringify(filters), () => {
    assert.throws(() => buildWinfrCommand({ ...baseRequest, filters }), /filtro/i);
  });
}

for (const [duplicatePolicy, response] of [
  ["keepBoth", "b"], ["skip", "n"], ["overwrite", "a"],
]) {
  test("preserva política de duplicados " + duplicatePolicy, () => {
    for (const mode of ["regular", "extensive"]) {
      const command = buildWinfrCommand({ ...baseRequest, mode, duplicatePolicy });
      assert.equal(command.duplicatePromptResponse, response);
      assert.equal(command.args.includes("/o:" + response), mode === "regular");
      assert.ok(command.args.includes("/a"));
    }
  });
}

test("normaliza unidade, modo e extensões sem alterar acentos", () => {
  const command = buildWinfrCommand({
    ...baseRequest, sourceDrive: " c: ", mode: " EXTENSIVE ", filters: [" *.TXT ", "*.tar.gz"],
  });
  assert.deepEqual(command.filters, ["\\RecoveryLab\\*.TXT", "\\RecoveryLab\\*.tar.gz"]);
  assert.equal(command.mode, "extensive");
  assert.equal(command.sourceDrive, "C:");
});

test("preview escapa barra final apenas na representação entre aspas", () => {
  const command = buildWinfrCommand({
    ...baseRequest, sourceFolder: "C:\\Recuperação Teste", destinationPath: "D:\\Destino Teste\\",
  });
  assert.equal(command.displayCommand,
    'winfr.exe C: "D:\\Destino Teste\\\\" /regular /a /o:b /n "\\Recuperação Teste\\\\"');
  assert.deepEqual(command.args, [
    "C:", "D:\\Destino Teste\\", "/regular", "/a", "/o:b", "/n", "\\Recuperação Teste\\",
  ]);
});

test("preserva validações de destino, modo e política", () => {
  for (const change of [
    { destinationPath: "c:\\Saida" }, { destinationPath: "\\\\server\\share" },
    { sourceDrive: "C" }, { mode: "signature" }, { duplicatePolicy: "invalid" },
  ]) {
    assert.throws(() => buildWinfrCommand({ ...baseRequest, ...change }));
  }
});
