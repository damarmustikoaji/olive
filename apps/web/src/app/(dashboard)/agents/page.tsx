import { repositories } from "@/lib/repositories";
import { setAgentTarget } from "./actions";
import type { Task } from "@ai-workforce/core";

interface RosterEntry {
  agentName: string;
  role: string;
  level: string;
  status: "active" | "not_hired";
  responsibilities: string[];
}

const ROSTER: RosterEntry[] = [
  {
    agentName: "workforce-manager",
    role: "Workforce Manager",
    level: "Manager",
    status: "active",
    responsibilities: [
      "Triase & assign task dari backlog ke specialist yang sesuai",
      "Klasifikasi severity tiap task (minor/medium/critical)",
      "Auto-approve & auto-publish task non-critical",
      "Eskalasi task critical ke Owner untuk approval manual",
    ],
  },
  {
    agentName: "marketing-content-writer",
    role: "Marketing Content Writer",
    level: "Specialist",
    status: "active",
    responsibilities: [
      "Generate blog, LinkedIn, X, Facebook, Instagram, Newsletter, Threads dari release note",
      "Generate SEO title/description/hashtag",
      "Publish ke Threads (kalau task non-critical & disetujui otomatis oleh Manager)",
    ],
  },
  {
    agentName: "developer",
    role: "Developer",
    level: "Specialist",
    status: "not_hired",
    responsibilities: ["Belum diimplementasikan — rencana: coding di feature branch, test, buat Pull Request"],
  },
  {
    agentName: "qa",
    role: "QA Engineer",
    level: "Specialist",
    status: "not_hired",
    responsibilities: ["Belum diimplementasikan — rencana: automated testing, regression, laporan bug"],
  },
];

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default async function AgentsPage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - SEVEN_DAYS_MS);

  const allTasks = await repositories.tasks.listAll(200);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Agents</h1>
        <p className="text-sm text-neutral-500">Roster, tanggung jawab, dan performa nyata tiap AI agent.</p>
      </div>

      <div className="space-y-4">
        {ROSTER.map((entry) =>
          entry.status === "active" ? (
            <ActiveAgentCard key={entry.agentName} entry={entry} allTasks={allTasks} sevenDaysAgo={sevenDaysAgo} />
          ) : (
            <NotHiredCard key={entry.agentName} entry={entry} />
          ),
        )}
      </div>
    </div>
  );
}

async function ActiveAgentCard({
  entry,
  allTasks,
  sevenDaysAgo,
}: {
  entry: RosterEntry;
  allTasks: Task[];
  sevenDaysAgo: Date;
}) {
  if (entry.agentName === "workforce-manager") {
    const totalTriaged = allTasks.length;
    const escalated = allTasks.filter((t) => t.severity === "critical").length;
    const autoResolved = allTasks.filter((t) => t.status === "done").length;

    return (
      <AgentCard entry={entry}>
        <Stat label="Total task ditriase" value={totalTriaged} />
        <Stat label="Auto-resolved (non-critical)" value={autoResolved} color="text-green-400" />
        <Stat label="Eskalasi ke Owner (critical)" value={escalated} color="text-yellow-400" />
      </AgentCard>
    );
  }

  const myTasks = allTasks.filter((t) => t.assigneeAgent === entry.agentName);
  const myTasksThisWeek = myTasks.filter((t) => t.createdAt >= sevenDaysAgo);
  const doneThisWeek = myTasksThisWeek.filter((t) => t.status === "done").length;
  const pendingReview = myTasks.filter((t) => t.status === "ready_for_review").length;

  let piecesGenerated = 0;
  let piecesPublished = 0;
  for (const task of myTasks) {
    if (!task.contentBatchId) continue;
    const pieces = await repositories.contentPieces.listByBatch(task.contentBatchId);
    piecesGenerated += pieces.length;
    piecesPublished += pieces.filter((p) => p.publishedAt).length;
  }

  const usage = await repositories.aiInvocations.sumUsageByAgent(entry.agentName, sevenDaysAgo);
  const targets = await repositories.agentTargets.getByAgent(entry.agentName);
  const postsPerWeekTarget = targets.find((t) => t.metric === "posts_per_week")?.targetValue;

  return (
    <AgentCard entry={entry}>
      <Stat label="Task selesai (7 hari)" value={doneThisWeek} color="text-green-400" />
      <Stat label="Menunggu approval Owner" value={pendingReview} color="text-yellow-400" />
      <Stat label="Content piece dihasilkan" value={piecesGenerated} />
      <Stat label="Piece ter-publish" value={piecesPublished} />
      <Stat label="Token usage (7 hari)" value={usage.inputTokens + usage.outputTokens} />

      <div className="col-span-2 mt-2 border-t border-neutral-800 pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-400">
            Target: post/minggu — {doneThisWeek} / {postsPerWeekTarget ?? "belum diset"}
          </span>
        </div>
        {postsPerWeekTarget !== undefined && (
          <div className="mt-1 h-1.5 w-full rounded-full bg-neutral-800">
            <div
              className="h-1.5 rounded-full bg-blue-500"
              style={{ width: `${Math.min(100, (doneThisWeek / postsPerWeekTarget) * 100)}%` }}
            />
          </div>
        )}
        <form action={setAgentTarget} className="mt-2 flex items-center gap-2">
          <input type="hidden" name="agentName" value={entry.agentName} />
          <input type="hidden" name="metric" value="posts_per_week" />
          <input
            type="number"
            name="targetValue"
            min={0}
            defaultValue={postsPerWeekTarget}
            placeholder="Target post/minggu"
            className="w-40 rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm"
          />
          <button
            type="submit"
            className="rounded border border-neutral-700 px-3 py-1 text-sm text-neutral-300 hover:bg-neutral-900"
          >
            Simpan Target
          </button>
        </form>
      </div>
    </AgentCard>
  );
}

function NotHiredCard({ entry }: { entry: RosterEntry }) {
  return (
    <div className="rounded border border-dashed border-neutral-800 p-4 opacity-60">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">
            {entry.role} <span className="text-xs text-neutral-500">— {entry.level}</span>
          </h2>
        </div>
        <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">Belum ada agent</span>
      </div>
      <ul className="mt-2 list-inside list-disc text-sm text-neutral-500">
        {entry.responsibilities.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  );
}

function AgentCard({ entry, children }: { entry: RosterEntry; children: React.ReactNode }) {
  return (
    <div className="rounded border border-neutral-800 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-medium">
            {entry.role} <span className="text-xs text-neutral-500">— {entry.level}</span>
          </h2>
        </div>
        <span className="rounded bg-green-900 px-2 py-0.5 text-xs text-green-300">Active</span>
      </div>
      <ul className="mt-2 list-inside list-disc text-sm text-neutral-500">
        {entry.responsibilities.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">{children}</div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`text-lg font-semibold ${color ?? ""}`}>{value}</p>
    </div>
  );
}
