"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState } from "react";

type LibraryExercise = {
  id: string;
  name: string;
  group: string;
  file: string;
};

type WorkoutExercise = LibraryExercise & {
  uid: string;
  sets: number;
  reps: number;
  notes: string;
  dataUri?: string;
};

const fallbackExercises: LibraryExercise[] = [
  {
    id: "demo-1",
    name: "Agachamento Livre",
    group: "Pernas",
    file: "placeholder.gif",
  },
  {
    id: "demo-2",
    name: "Supino",
    group: "Peito",
    file: "placeholder.gif",
  },
  {
    id: "demo-3",
    name: "Remada Curvada",
    group: "Costas",
    file: "placeholder.gif",
  },
];

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      bytes.subarray(i, i + chunkSize) as unknown as number[],
    );
  }
  return btoa(binary);
};

const normalizeBaseUrl = (url: string | undefined) => {
  if (!url) return "";
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

const baseUrl =
  normalizeBaseUrl(process.env.NEXT_PUBLIC_GIFS_BASE_URL) || "/gifs";
const manifestUrl =
  normalizeBaseUrl(process.env.NEXT_PUBLIC_GIFS_MANIFEST_URL) ||
  `${baseUrl}/manifest.json`;

const buildHtml = (items: WorkoutExercise[], studentName: string) => {
  const title = studentName
    ? `Treino - ${studentName} | Studio Ferraz`
    : "Treino | Studio Ferraz";

  const bodyItems = items
    .map(
      (ex, idx) => `
      <section class="exercise">
        <header>
          <span class="index">${idx + 1}</span>
          <div class="meta">
            <h2>${ex.name}</h2>
            <p>${ex.group} • ${ex.sets} x ${ex.reps}</p>
          </div>
        </header>
        <div class="media">
          <img src="${ex.dataUri}" alt="${ex.name}" />
        </div>
        <p class="notes">${ex.notes || "Observações..."}</p>
      </section>
    `,
    )
    .join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f7fb;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --accent: #111827;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: "Inter", system-ui, -apple-system, sans-serif;
      background: radial-gradient(circle at 0% 0%, #f0f4ff, #f9fafb 35%, #f7f7fb);
      color: var(--text);
      padding: 32px;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 960px;
      margin: 0 auto;
    }
    h1 {
      font-size: 28px;
      letter-spacing: -0.02em;
      margin-bottom: 12px;
    }
    .sub {
      color: var(--muted);
      margin-bottom: 24px;
    }
    .exercise {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 18px;
      padding: 18px;
      margin-bottom: 18px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.04);
    }
    .exercise header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .index {
      height: 36px; width: 36px;
      display: grid; place-items: center;
      border-radius: 10px;
      background: #0f172a;
      color: #fff;
      font-weight: 700;
    }
    .meta h2 { font-size: 18px; margin-bottom: 4px; }
    .meta p { color: var(--muted); font-size: 14px; }
    .media {
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: #0b1220;
      display: grid;
      place-items: center;
    }
    .media img { width: 100%; height: auto; display: block; }
    .notes {
      margin-top: 10px;
      padding: 10px 12px;
      border-radius: 12px;
      background: #f8fafc;
      border: 1px dashed var(--border);
      color: var(--muted);
      min-height: 48px;
      white-space: pre-wrap;
    }
    @media (max-width: 720px) {
      body { padding: 18px; }
      .exercise { padding: 14px; }
      .media img { max-height: 320px; object-fit: contain; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <h1>Studio Ferraz • Treino ${studentName ? `de ${studentName}` : ""}</h1>
    <p class="sub">GIFs embutidos: funciona offline no iPhone/Mac. Para compartilhar, envie este arquivo .html.</p>
    ${bodyItems}
  </div>
</body>
</html>`;
};

export default function Home() {
  const [library, setLibrary] = useState<LibraryExercise[]>(fallbackExercises);
  const [searchTerm, setSearchTerm] = useState("");
  const [studentName, setStudentName] = useState("");
  const [selected, setSelected] = useState<WorkoutExercise[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [status, setStatus] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const hasQuery = searchTerm.trim().length > 0;

  const resolveFile = (file: string) => {
    if (file.startsWith("http://") || file.startsWith("https://")) {
      return file;
    }
    return `${baseUrl}/${file}`;
  };

  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const res = await fetch(manifestUrl);
        if (!res.ok) throw new Error("manifest not found");
        const data = await res.json();
        if (Array.isArray(data)) {
          setLibrary(
            data.map((item, idx) => ({
              id: item.id ?? `gif-${idx}`,
              name: item.name ?? item.file ?? `Exercício ${idx + 1}`,
              group: item.group ?? "Geral",
              file: item.url ?? item.file ?? item.path ?? "placeholder.gif",
            })),
          );
        } else {
          setLibrary(fallbackExercises);
        }
      } catch (error) {
        console.warn(
          "Usando lista de exemplo, não encontrei manifest.json",
          error,
        );
        setLibrary(fallbackExercises);
      } finally {
        setLoadingLibrary(false);
      }
    };

    loadLibrary();
  }, [manifestUrl]);

  const filteredLibrary = useMemo(() => {
    if (!hasQuery) return [];
    const term = searchTerm.toLowerCase();
    return library.filter((ex) => {
      const matchesTerm =
        !term ||
        ex.name.toLowerCase().includes(term) ||
        ex.group.toLowerCase().includes(term);
      return matchesTerm;
    });
  }, [library, searchTerm, hasQuery]);

  const groupedLibrary = useMemo(() => {
    const groups: Record<string, LibraryExercise[]> = {};
    filteredLibrary.forEach((ex) => {
      const key = ex.group || "Geral";
      if (!groups[key]) groups[key] = [];
      groups[key].push(ex);
    });
    return groups;
  }, [filteredLibrary]);

  const addExercise = (exercise: LibraryExercise) => {
    setSelected((prev) => [
      ...prev,
      {
        ...exercise,
        uid: `${exercise.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        sets: 3,
        reps: 10,
        notes: "",
      },
    ]);
  };

  const updateExercise = (uid: string, patch: Partial<WorkoutExercise>) => {
    setSelected((prev) =>
      prev.map((item) => (item.uid === uid ? { ...item, ...patch } : item)),
    );
  };

  const removeExercise = (uid: string) => {
    setSelected((prev) => prev.filter((item) => item.uid !== uid));
  };

  const moveExercise = (uid: string, direction: "up" | "down") => {
    setSelected((prev) => {
      const index = prev.findIndex((i) => i.uid === uid);
      if (index === -1) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const exportHtml = async () => {
    if (!selected.length) {
      setStatus("Adicione exercícios antes de exportar.");
      return;
    }

    setExporting(true);
    setStatus("Incorporando GIFs e gerando HTML...");

    try {
      const withDataUris = await Promise.all(
        selected.map(async (ex) => {
          const url = resolveFile(ex.file);
          const response = await fetch(url, {
            mode: "cors",
            credentials: "omit",
          });
          if (!response.ok) {
            throw new Error(
              `GIF não encontrado ou bloqueado: ${url} (${response.status})`,
            );
          }
          const buffer = await response.arrayBuffer();
          const base64 = arrayBufferToBase64(buffer);
          return { ...ex, dataUri: `data:image/gif;base64,${base64}` };
        }),
      );

      const html = buildHtml(withDataUris, studentName);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${studentName || "treino"}-studio-ferraz.html`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus(
        "Exportação concluída. Abra o HTML no iPhone para ver as animações.",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Erro ao gerar HTML. Tente novamente.";
      setStatus(message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafc] via-white to-[#eef2ff] text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Studio Rodolfo Ferraz</p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Criador de treinos
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Nome do aluno"
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-base text-slate-900 placeholder:text-slate-400 outline-none ring-2 ring-transparent transition focus:ring-slate-900/20"
              />
              <button
                onClick={exportHtml}
                disabled={exporting}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 transition hover:translate-y-[-1px] hover:shadow-slate-900/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {exporting ? "Exportando..." : "Exportar"}
              </button>
            </div>
          </div>
          {status && (
            <div className="text-sm text-slate-700 drop-shadow-sm">{status}</div>
          )}
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xl backdrop-blur">
            <div className="flex flex-wrap gap-3">
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar exercício ou nome"
                autoFocus
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 outline-none ring-2 ring-transparent transition focus:ring-slate-900/15"
              />
            </div>

            <div className="flex flex-col gap-3">
              {!hasQuery && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                  Digite o nome do exercício para ver as GIFs.
                </div>
              )}

              {hasQuery &&
                Object.entries(groupedLibrary).map(([group, exercises]) => {
                  return (
                    <div
                      key={group}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex w-full items-center justify-between px-4 py-3 text-left">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 bg-slate-900 text-xs font-semibold text-white">
                            {exercises.length}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">{group}</span>
                        </div>
                      </div>
                      <div className="grid gap-4 border-t border-slate-100 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-3">
                        {exercises.map((exercise) => (
                          <button
                            key={exercise.id}
                            onClick={() => addExercise(exercise)}
                            className="group relative flex h-56 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-lg transition hover:-translate-y-1 hover:shadow-slate-300/80"
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-white/60 opacity-0 transition group-hover:opacity-100" />
                            <img
                              src={resolveFile(exercise.file)}
                              alt={exercise.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 p-3">
                              <p className="text-xs text-slate-100 drop-shadow">{exercise.group}</p>
                              <p className="text-sm font-semibold text-white drop-shadow">
                                {exercise.name}
                              </p>
                            </div>
                            <span className="absolute right-3 top-3 z-10 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold uppercase text-slate-900">
                              Adicionar
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}

              {hasQuery && !filteredLibrary.length && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                  Nenhum exercício encontrado.
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
                    Treino atual
                  </p>
                  <h2 className="text-xl font-semibold text-slate-900">Exercícios selecionados</h2>
                </div>
                <span className="text-sm text-slate-500">{selected.length} itens</span>
              </div>

              <div className="flex flex-col gap-3">
                {selected.map((item, idx) => (
                  <div
                    key={item.uid}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="flex flex-col">
                          <p className="text-xs text-slate-500">#{idx + 1}</p>
                          <input
                            value={item.name}
                            onChange={(e) => updateExercise(item.uid, { name: e.target.value })}
                            className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-semibold text-slate-900 outline-none ring-1 ring-transparent transition focus:ring-slate-900/15"
                          />
                          <p className="text-xs text-slate-500">{item.group}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => moveExercise(item.uid, "up")}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:border-slate-500 hover:text-slate-900 disabled:opacity-40"
                            disabled={idx === 0}
                          >
                            Subir
                          </button>
                          <button
                            onClick={() => moveExercise(item.uid, "down")}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:border-slate-500 hover:text-slate-900 disabled:opacity-40"
                            disabled={idx === selected.length - 1}
                          >
                            Descer
                          </button>
                          <button
                            onClick={() => removeExercise(item.uid)}
                            className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:border-red-400 hover:text-red-500"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1">
                          <span className="text-slate-600">Séries</span>
                          <input
                            type="number"
                            min={1}
                            value={item.sets}
                            onChange={(e) =>
                              updateExercise(item.uid, { sets: Number(e.target.value) })
                            }
                            className="w-16 rounded-md bg-white px-2 py-1 text-center text-slate-900 outline-none ring-1 ring-transparent transition focus:ring-slate-900/15"
                          />
                        </label>
                        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1">
                          <span className="text-slate-600">Reps</span>
                          <input
                            type="number"
                            min={1}
                            value={item.reps}
                            onChange={(e) =>
                              updateExercise(item.uid, { reps: Number(e.target.value) })
                            }
                            className="w-16 rounded-md bg-white px-2 py-1 text-center text-slate-900 outline-none ring-1 ring-transparent transition focus:ring-slate-900/15"
                          />
                        </label>
                      </div>
                      <textarea
                        value={item.notes}
                        onChange={(e) => updateExercise(item.uid, { notes: e.target.value })}
                        placeholder="Observações, dicas de execução..."
                        rows={2}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none ring-1 ring-transparent transition focus:ring-slate-900/15"
                      />
                    </div>
                  </div>
                ))}

                {!selected.length && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                    Selecione exercícios na coluna da esquerda para montar o treino.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
